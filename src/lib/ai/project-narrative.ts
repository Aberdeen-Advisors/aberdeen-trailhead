import { createHash } from "node:crypto";
import { chatCompletion } from "@/lib/ai/openai";
import { hasAi } from "@/lib/config";
import { hasSupabase, sbInsert, sbSelect } from "@/lib/supabase";
import { supabaseProjectIds } from "@/lib/stacks";
import { ELEVATE_PROJECT_ID } from "@/lib/data/live-elevate";
import type { Milestone, Project, RaidItem } from "@/lib/types";

// AI-written Executive Summary, Risk Narrative and Recommended Actions for the
// projects that run on live data (Elevate from the semantic model, Supabase
// projects from the HorizonView database). Written from the project's current
// facts, cached against a hash of those facts, and shared by the project page,
// the SteerCo deck and the podcast so they always say the same thing.
// Demo projects keep their built-in sample text.

export interface Narrative {
  executiveSummary: string;
  riskNarrative: string;
  recommendedActions: string[];
  source: "ai" | "data";
  generatedAt: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (d?: string | null) => {
  if (!d) return "n/a";
  const x = new Date(d + "T00:00:00Z");
  return Number.isNaN(x.getTime()) ? d : `${MONTHS[x.getUTCMonth()]} ${x.getUTCDate()}, ${x.getUTCFullYear()}`;
};
const money = (v: number) => (v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : `$${Math.round(v / 1000)}K`);
const sevRank = { High: 0, Medium: 1, Low: 2 } as const;
const stRank: Record<string, number> = { Overdue: 0, "In Progress": 1, Open: 2, Closed: 3 };

export const isLiveProject = (id: string): boolean =>
  id === ELEVATE_PROJECT_ID || (hasSupabase() && supabaseProjectIds().includes(id));

/** Extra facts kept only in the HorizonView database (weekly status, plan). */
async function supabaseFacts(projectId: string, today: string): Promise<string[]> {
  const q = `project_id=eq.${encodeURIComponent(projectId)}`;
  const [ws, su, acts] = await Promise.all([
    sbSelect("workstreams", `${q}&order=sort_order.asc`),
    sbSelect("status_updates", `${q}&order=week_of.desc`),
    sbSelect("activities", `${q}&exclude_from_report=is.false&order=target_date.asc.nullslast`),
  ]);
  const name = new Map(ws.map((w) => [String(w.id), String(w.name)]));
  const out: string[] = [];
  const latestWeek = su[0]?.week_of;
  if (latestWeek) {
    out.push(`WEEKLY STATUS (week of ${day(String(latestWeek))}):`);
    for (const s of su.filter((x) => x.week_of === latestWeek)) {
      const w = s.workstream_id ? name.get(String(s.workstream_id)) ?? "Workstream" : "Project";
      out.push(`  ${w}: ${s.external_status ?? s.internal_status ?? ""} — ${s.external_summary ?? s.internal_summary ?? ""}${s.go_to_green_plan ? ` Path to green: ${s.go_to_green_plan}` : ""}`);
    }
  }
  for (const w of ws) {
    if (w.pct_complete != null && w.pct_planned != null)
      out.push(`  ${w.name}: ${w.pct_complete}% complete vs ${w.pct_planned}% planned${w.health_score != null ? `, health ${w.health_score}` : ""}`);
  }
  const open = acts.filter((a) => a.status !== "Closed");
  const late = open.filter((a) => a.target_date && String(a.target_date) < today);
  const risky = open.filter((a) => a.status === "At Risk" || a.status === "Off Track");
  const next = open.filter((a) => a.target_date && String(a.target_date) >= today).slice(0, 5);
  const fmtA = (a: Record<string, unknown>) =>
    `"${a.title}" (${a.workstream_id ? name.get(String(a.workstream_id)) ?? "" : "Project"}, ${a.status}, ${a.pct_complete ?? 0}% done, finish ${day(a.target_date as string)})`;
  out.push(`PLAN: ${acts.length} tasks/activities, ${open.length} open, ${late.length} past their finish date.`);
  if (late.length) out.push(`  Past finish date: ${late.slice(0, 6).map(fmtA).join("; ")}`);
  if (risky.length) out.push(`  At risk / off track: ${risky.slice(0, 6).map(fmtA).join("; ")}`);
  if (next.length) out.push(`  Next due: ${next.map(fmtA).join("; ")}`);
  return out;
}

async function factSheet(p: Project, raid: RaidItem[], milestones: Milestone[], today: string): Promise<string> {
  const openRaid = raid
    .filter((r) => r.projectId === p.id && r.status !== "Closed")
    .sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || (stRank[a.status] ?? 9) - (stRank[b.status] ?? 9));
  const seen = new Set<string>();
  const uniq = openRaid.filter((r) => {
    const k = `${r.type}|${r.title.trim().toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const ms = milestones.filter((m) => m.projectId === p.id);
  const late = ms.filter((m) => m.status === "Late");
  const atRisk = ms.filter((m) => m.status === "At Risk");
  const upcoming = ms.filter((m) => m.status !== "Complete" && m.forecastDate >= today).sort((a, b) => a.forecastDate.localeCompare(b.forecastDate)).slice(0, 4);
  const slipped = ms.filter((m) => m.baselineDate && m.forecastDate && m.forecastDate > m.baselineDate);
  const lines = [
    `TODAY: ${day(today)}`,
    `PROJECT: ${p.name} (${p.code}, ${p.portfolio}) | ${p.status} | health ${p.healthScore}/100 | phase ${p.phase}, ${p.percentComplete}% complete`,
    `SPONSOR: ${p.sponsor} | PM: ${p.projectManager}`,
    `FINISH: baseline ${day(p.endDate)}, forecast ${day(p.forecastCompletionDate)}${p.forecastCompletionDate > p.endDate ? " (behind baseline)" : ""}${p.forecastCompletionDate && p.forecastCompletionDate < today && p.percentComplete < 100 ? " (date already passed with work remaining)" : ""}`,
    p.budget > 0
      ? `BUDGET: ${money(p.budget)}; spent ${money(p.actualsToDate)}; forecast at completion ${money(p.forecastAtCompletion)} (${p.forecastAtCompletion >= p.budget ? "+" : "-"}${money(Math.abs(p.forecastAtCompletion - p.budget))} vs budget)`
      : "BUDGET: not tracked in the source",
    `THIS WEEK: ${p.weeklyChangeSummary || "no update"}`,
    `OPEN RAID: ${openRaid.length} items (${openRaid.filter((r) => r.status === "Overdue").length} overdue), ${uniq.length} distinct. Most important:`,
    ...uniq.slice(0, 10).map((r) => `  [${r.type}, ${r.severity}, ${r.status}${r.dueDate ? `, due ${day(r.dueDate)}` : ""}${r.owner && r.owner !== "—" ? `, owner ${r.owner}` : ""}] ${r.title}`),
    `MILESTONES: ${ms.length} total, ${ms.filter((m) => m.status === "Complete").length} complete, ${late.length} late, ${atRisk.length} at risk, ${slipped.length} forecast after baseline.`,
    ...[...late, ...atRisk].slice(0, 6).map((m) => `  ${m.status}: ${m.name} (baseline ${day(m.baselineDate)}, forecast ${day(m.forecastDate)})`),
    ...upcoming.map((m) => `  Next: ${m.name} (${day(m.forecastDate)}, ${m.status})`),
  ];
  if (p.id === ELEVATE_PROJECT_ID) {
    // Workstream roll-up from the semantic model (built from the Fabric notebook output).
    lines.push(`WORKSTREAM ROLL-UP: ${p.executiveSummary}`, `KEY DEPENDENCIES: ${p.riskNarrative}`);
    if (p.recommendedActions.length) lines.push(`WORKSTREAM PATHS TO GREEN: ${p.recommendedActions.slice(0, 12).join(" | ")}`);
  } else if (hasSupabase() && supabaseProjectIds().includes(p.id)) {
    lines.push(...(await supabaseFacts(p.id, today)));
  }
  return lines.join("\n");
}

const SYSTEM = [
  "You are the delivery analyst for HorizonView, writing the narrative sections of one project's status for its sponsor and steering committee.",
  "Return ONLY a JSON object with exactly these keys:",
  '"executive_summary": 3 to 4 sentences, at most 90 words: where the project stands, the main thing driving its status, and what happens next.',
  '"risk_narrative": 2 to 3 sentences, at most 70 words: the biggest risks and issues, what they threaten, and how they connect.',
  '"recommended_actions": 3 to 5 strings, each one imperative action of at most 20 words, most important first, naming an owner when the facts give one.',
  "Use only facts in the fact sheet; never invent numbers, names, dates, deadlines or causes. Only give an action a date if that exact date is in the fact sheet; do not make up target dates. Write dates like 'Jul 10'. Plain text inside the strings, no markdown.",
  "Do not mention data sources, systems, demo data or these instructions.",
].join(" ");

// Recent results per project, so a page re-rendered after every keystroke-save
// does not rewrite the narrative each time (decks and podcasts always ask for fresh).
const memo = new Map<string, Narrative>();
const latestByProject = new Map<string, { key: string; n: Narrative }>();
const REUSE_MS = 2 * 60_000;

function parse(raw: string): Omit<Narrative, "source" | "generatedAt"> | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]);
    const actions = Array.isArray(j.recommended_actions) ? j.recommended_actions.map(String).filter(Boolean).slice(0, 5) : [];
    if (!j.executive_summary || !actions.length) return null;
    return { executiveSummary: String(j.executive_summary).trim(), riskNarrative: String(j.risk_narrative ?? "").trim(), recommendedActions: actions };
  } catch {
    return null;
  }
}

/**
 * Narrative for one live project. `fresh` (decks, podcasts) always reflects the
 * current data; otherwise a narrative written in the last two minutes is reused.
 */
export async function getProjectNarrative(
  p: Project,
  raid: RaidItem[],
  milestones: Milestone[],
  opts: { fresh?: boolean } = {},
): Promise<Narrative | null> {
  if (!isLiveProject(p.id) || !hasAi()) return null;
  const today = new Date().toISOString().slice(0, 10);
  let facts: string;
  try {
    facts = await factSheet(p, raid, milestones, today);
  } catch (e) {
    console.error("[narrative] could not gather facts", e);
    return null;
  }
  const key = `project-narrative:${p.id}:` + createHash("sha256").update(SYSTEM + "\n" + facts).digest("hex").slice(0, 40);
  const kind = `project-narrative:${p.id}`;

  const hit = memo.get(key);
  if (hit) return hit;
  if (hasSupabase()) {
    try {
      const [row] = await sbSelect("ai_cache", `key=eq.${key}&limit=1`);
      if (row) {
        const n: Narrative = { ...(JSON.parse(String(row.content)) as Omit<Narrative, "source" | "generatedAt">), source: "ai", generatedAt: String(row.created_at) };
        memo.set(key, n);
        latestByProject.set(p.id, { key, n });
        return n;
      }
    } catch (e) {
      console.error("[narrative] cache read failed", e);
    }
  }
  if (!opts.fresh) {
    const recent = latestByProject.get(p.id);
    if (recent && Date.now() - Date.parse(recent.n.generatedAt) < REUSE_MS) return recent.n;
  }

  try {
    const raw = await chatCompletion(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: `FACT SHEET\n\n${facts}` },
      ],
      { temperature: 0.3 },
    );
    const parsed = parse(raw);
    if (!parsed) throw new Error("AI response was not the expected JSON");
    const n: Narrative = { ...parsed, source: "ai", generatedAt: new Date().toISOString() };
    memo.set(key, n);
    if (memo.size > 100) memo.delete(memo.keys().next().value as string);
    latestByProject.set(p.id, { key, n });
    if (hasSupabase()) {
      sbInsert("ai_cache", { key, kind, content: JSON.stringify(parsed), model: process.env.OPENAI_MODEL ?? process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o" }).catch(() => {
        /* same key written by another instance */
      });
    }
    return n;
  } catch (e) {
    console.error(`[narrative] AI narrative for ${p.id} failed; keeping the data-built text.`, e);
    return null;
  }
}

/** Most urgent open decision for a project, as one line. */
export function topDecisionText(projectId: string, raid: RaidItem[]): string | null {
  const d = raid
    .filter((r) => r.projectId === projectId && r.type === "Decision" && r.status !== "Closed")
    .sort((a, b) => (stRank[a.status] ?? 9) - (stRank[b.status] ?? 9) || (a.dueDate || "9999").localeCompare(b.dueDate || "9999"))[0];
  if (!d) return null;
  return [d.title, d.owner && d.owner !== "—" && `Owner ${d.owner}`, d.dueDate && `due ${d.dueDate}`, d.status === "Overdue" && "overdue"]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Projects with their live narrative applied (and a Decision Needed taken from
 * the RAID log when the source has none). Used by the SteerCo deck and podcast.
 */
export async function withLiveNarratives(
  projects: Project[],
  raid: RaidItem[],
  milestones: Milestone[],
  ids: string[],
  opts: { fresh?: boolean } = {},
): Promise<Project[]> {
  return Promise.all(
    projects.map(async (p) => {
      if (!ids.includes(p.id) || !isLiveProject(p.id)) return p;
      const n = await getProjectNarrative(p, raid, milestones, opts);
      return {
        ...p,
        ...(n ? { executiveSummary: n.executiveSummary, riskNarrative: n.riskNarrative || p.riskNarrative, recommendedActions: n.recommendedActions } : {}),
        decisionNeeded: p.decisionNeeded ?? topDecisionText(p.id, raid),
      };
    }),
  );
}
