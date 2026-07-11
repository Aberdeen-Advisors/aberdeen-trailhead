// Live-mode mapping: HorizonView semantic model (Elevate workspace) → portal types.
// The model tracks ONE program ("Project Elevate") by workstream, so the portal
// portfolio contains a single project synthesized from Weekly Status,
// Key Milestones, and RAID Log.
//
// Column names verified against the model view; run scripts/test-powerbi.mjs
// after credentials are in place to confirm exact values.

import { executeDax } from "@/lib/msft/powerbi";
import type {
  Project,
  RaidItem,
  Milestone,
  HealthStatus,
  MilestoneStatus,
  RaidType,
} from "@/lib/types";

export const ELEVATE_PROJECT_ID = "elevate";

type Row = Record<string, unknown>;
const str = (v: unknown): string => (v == null ? "" : String(v).trim());
const num = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);
// Env override for data not present in the model (financials, people).
const env = (k: string, fallback = ""): string => process.env[k] ?? fallback;

// ── Normalizers ───────────────────────────────────────────────────────────────

function normalizeRag(v: string): HealthStatus {
  if (/red|off track|blocked|critical/i.test(v)) return "Red";
  if (/amber|yellow|at risk|caution/i.test(v)) return "Amber";
  return "Green";
}

function normalizeMilestoneStatus(v: string): MilestoneStatus {
  if (/complete|done|closed/i.test(v)) return "Complete";
  if (/late|overdue|slip|red/i.test(v)) return "Late";
  if (/risk|amber|yellow/i.test(v)) return "At Risk";
  return "On Track";
}

function normalizeRaidType(v: string): RaidType {
  if (/^a/i.test(v)) return "Assumption";
  if (/^i/i.test(v)) return "Issue";
  if (/^dec/i.test(v)) return "Decision";
  if (/^dep/i.test(v)) return "Dependency";
  return "Risk";
}

function normalizeSeverity(v: string): "High" | "Medium" | "Low" {
  if (/high|critical|1/i.test(v)) return "High";
  if (/low|3/i.test(v)) return "Low";
  return "Medium";
}

const iso = (v: unknown): string => {
  const d = new Date(str(v));
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

// ── Milestones ← 'Key Milestones' ────────────────────────────────────────────

export async function getLiveMilestones(): Promise<Milestone[]> {
  const rows = await executeDax<Row>(`EVALUATE 'Key Milestones'`);
  return rows.map((r, i) => ({
    id: str(r["Milestone ID"]) || `ms-${i}`,
    projectId: ELEVATE_PROJECT_ID,
    name: str(r["MilestoneTitle"]) || str(r["Title"]),
    baselineDate: iso(r["Target Date"]),
    forecastDate: iso(r["Target Date"]),
    status: normalizeMilestoneStatus(str(r["Status"])),
  }));
}

// ── RAID ← 'RAID Log' ────────────────────────────────────────────────────────

export async function getLiveRaid(): Promise<RaidItem[]> {
  const rows = await executeDax<Row>(`EVALUATE 'RAID Log'`);
  const today = new Date().toISOString().slice(0, 10);
  return rows.map((r, i) => {
    const due = iso(r["Due Date"]) || iso(r["Planned Completion Date"]);
    const raw = str(r["Status"]);
    const status: RaidItem["status"] = /closed|complete|done/i.test(raw)
      ? "Closed"
      : /progress|active/i.test(raw)
        ? "In Progress"
        : due && due < today
          ? "Overdue"
          : "Open";
    return {
      id: str(r["RAID ID"]) || `raid-${i}`,
      projectId: ELEVATE_PROJECT_ID,
      type: normalizeRaidType(str(r["RaidType"])),
      title: str(r["RaidTitle"]) || str(r["Description"]).slice(0, 80),
      severity: normalizeSeverity(str(r["Priority"])),
      owner: str(r["Owner"]) || "—",
      dueDate: due,
      status,
    };
  });
}

// ── Project ← 'Weekly Status' + rollups ──────────────────────────────────────

const ragScore: Record<HealthStatus, number> = { Green: 85, Amber: 65, Red: 40 };

// The Fabric notebook writes workstream summaries in a fixed sentence pattern;
// parse the figures out so we can synthesize a short program-level narrative
// instead of concatenating a dozen paragraphs.
const grab = (text: string, re: RegExp): number => {
  const m = text.match(re);
  return m ? Number(m[1]) : 0;
};

export async function getLiveProjects(): Promise<Project[]> {
  const [weekly, milestones] = await Promise.all([
    executeDax<Row>(`EVALUATE 'Weekly Status'`),
    getLiveMilestones(),
  ]);

  const workstreams = weekly.map((r) => {
    const summary = str(r["Executive Summary"]);
    return {
      // NB: the model's column is spelled "Worksteam" (sic)
      name: str(r["Worksteam"]) || str(r["Workstream"]),
      rag: normalizeRag(str(r["RAG Status"])),
      summary,
      accomplishments: str(r["Weekly Accomplishments"]),
      dependencies: str(r["Critical Dependencies"]),
      pathToGreen: str(r["Path to Amber or Green"]),
      pct: grab(summary, /is at (\d+)% complete/i),
      tasks: grab(summary, /across (\d+) /i),
      blocked: grab(summary, /(\d+) task\(s\) currently blocked/i),
      offTrack: grab(str(r["Critical Dependencies"]), /(\d+) task\(s\) off track/i),
      closedThisPeriod: grab(str(r["Weekly Accomplishments"]), /Closed (\d+) task\(s\)/i),
      inProgress: grab(str(r["Weekly Accomplishments"]), /(\d+) actively in progress/i),
    };
  });

  const status: HealthStatus = workstreams.some((w) => w.rag === "Red")
    ? "Red"
    : workstreams.some((w) => w.rag === "Amber")
      ? "Amber"
      : "Green";

  const healthScore = workstreams.length
    ? Math.round(workstreams.reduce((s, w) => s + ragScore[w.rag], 0) / workstreams.length)
    : 75;

  const complete = milestones.filter((m) => m.status === "Complete").length;
  const milestonePct = milestones.length ? Math.round((complete / milestones.length) * 100) : 0;
  const dates = milestones.map((m) => m.baselineDate).filter(Boolean).sort();

  // ── Aggregates for the synthesized narrative ────────────────────────────────
  const parsed = workstreams.filter((w) => w.tasks > 0);
  const totalTasks = parsed.reduce((s, w) => s + w.tasks, 0);
  const overallPct = totalTasks
    ? Math.round(parsed.reduce((s, w) => s + w.pct * w.tasks, 0) / totalTasks)
    : milestonePct;
  const totalBlocked = workstreams.reduce((s, w) => s + w.blocked, 0);
  const counts = { Green: 0, Amber: 0, Red: 0 } as Record<HealthStatus, number>;
  for (const w of workstreams) counts[w.rag]++;
  const laggards = [...parsed]
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3)
    .map((w) => `${w.name} (${w.pct}%)`)
    .join(", ");

  const executiveSummary = workstreams.length
    ? `Project Elevate is ${overallPct}% complete across ${totalTasks} Wave 1 tasks in ` +
      `${workstreams.length} workstreams (${counts.Green} Green, ${counts.Amber} Amber, ${counts.Red} Red). ` +
      `${totalBlocked ? `${totalBlocked} tasks are currently blocked. ` : ""}` +
      `Lowest-progress workstreams: ${laggards}.`
    : "No workstream summaries published yet.";

  // Risk narrative: group identical key dependencies instead of repeating them.
  const deps = new Map<string, string[]>();
  for (const w of workstreams) {
    const m = w.dependencies.match(/Key dependency: ([^.]+)\./i);
    if (m) deps.set(m[1], [...(deps.get(m[1]) ?? []), w.name]);
  }
  const totalOffTrack = workstreams.reduce((s, w) => s + w.offTrack, 0);
  const riskNarrative = deps.size
    ? `Key dependencies — ${Array.from(deps.entries())
        .map(([d, names]) => `${d} (${names.join(", ")})`)
        .join("; ")}. ${totalOffTrack} tasks are off track pending upstream input.`
    : "";

  // Weekly change: totals rather than twelve near-identical sentences.
  const closedSum = workstreams.reduce((s, w) => s + w.closedThisPeriod, 0);
  const progSum = workstreams.reduce((s, w) => s + w.inProgress, 0);
  const trend = workstreams
    .map((w) => w.accomplishments.match(/([^.]*trending[^.]*)\./i)?.[1]?.trim())
    .find(Boolean);
  const weeklyChangeSummary =
    closedSum || progSum
      ? `Closed ${closedSum} tasks this period across ${workstreams.length} workstreams; ` +
        `${progSum} actively in progress in Config & Data Readiness.${trend ? ` ${trend}.` : ""}`
      : "";

  return [
    {
      id: ELEVATE_PROJECT_ID,
      name: "Project Elevate",
      code: env("HV_PROJECT_CODE", "ELEVATE"),
      portfolio: env("HV_PROJECT_PORTFOLIO", "Aberdeen Advisors"),
      sponsor: env("HV_PROJECT_SPONSOR", "—"),
      projectManager: env("HV_PROJECT_PM", "—"),
      phase: env("HV_PROJECT_PHASE", "Delivery"),
      status,
      percentComplete: overallPct,
      startDate: dates[0] ?? "",
      endDate: dates[dates.length - 1] ?? "",
      healthScore,
      scheduleRiskScore: 100 - healthScore,
      budgetRiskScore: 100 - healthScore,
      forecastCompletionDate: dates[dates.length - 1] ?? "",
      executiveSummary,
      riskNarrative,
      recommendedActions: workstreams
        .filter((w) => w.pathToGreen && !/on track/i.test(w.pathToGreen))
        .map((w) => `${w.name}: ${w.pathToGreen}`),
      weeklyChangeSummary,
      decisionNeeded: null,
      podcastUrl: null,
      budget: num(env("HV_PROJECT_BUDGET", "0")),
      actualsToDate: num(env("HV_PROJECT_ACTUALS", "0")),
      forecastAtCompletion: num(env("HV_PROJECT_FAC", "0")),
      sharePointUrl: env("HV_PROJECT_SHAREPOINT_URL"),
      powerBiReportUrl: env("HV_PROJECT_REPORT_URL"),
    },
  ];
}
