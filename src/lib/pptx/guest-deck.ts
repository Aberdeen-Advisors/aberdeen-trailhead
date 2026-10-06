import { getMilestones, getProjects, getRaid, openDecisions } from "@/lib/data/provider";
import { demoDashboardDetail } from "@/lib/data/demo-data";
import { hasSupabase, sbSelect } from "@/lib/supabase";
import { isDbProject } from "@/lib/registry";
import type { Milestone, Project, RaidItem } from "@/lib/types";
import {
  buildPortfolioDashboard,
  fit,
  twoLines,
  type DashboardWorkstream,
  type DetailSlide,
  type SummarySlide,
} from "./executive-dashboard";

// Guest Demo Deck: the whole portfolio in a client's own PowerPoint template.
// Cover, a portfolio summary slide, then one project dashboard per project.
// Each project's status strip is built from the best data it has:
//   · HorizonView database projects: their workstreams, tasks and milestones
//   · projects with a workstream breakdown in the demo data (Phoenix)
//   · everything else: its milestones

const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const day = (iso: string) => new Date(iso.slice(0, 10) + "T00:00:00Z");
const short = (iso?: string | null) => (iso ? `${SHORT[day(iso).getUTCMonth()]} ${day(iso).getUTCDate()}` : "");
const days = (a: string, b: string) => Math.round((day(b).getTime() - day(a).getTime()) / 86_400_000);
const firstSentence = (s: string) => (s.match(/^.*?[.!?](\s|$)/)?.[0] ?? s).trim();

/** "Project Bravo - Northwind IT Integration" → "Bravo". */
export const shortName = (name: string) => name.replace(/^Project\s+/i, "").split(/\s+[-–—:]\s+/)[0].trim();

const STATUS_WORD: Record<string, string> = { Green: "on track", Amber: "needs attention", Red: "at risk" };
const STATUS_RANK: Record<string, number> = { Red: 0, Amber: 1, Green: 2 };

type Row = Record<string, any>;

/** Workstream strip for a project kept in the HorizonView database. */
async function databaseItems(projectId: string, today: string): Promise<DashboardWorkstream[]> {
  const q = `project_id=eq.${encodeURIComponent(projectId)}`;
  const [ws, acts, ms] = (await Promise.all([
    sbSelect("workstreams", `${q}&order=sort_order.asc,name.asc`),
    sbSelect("activities", `${q}&order=target_date.asc.nullslast`),
    sbSelect("milestones", `${q}&order=forecast_date.asc.nullslast`),
  ])) as Row[][];
  return ws.map((w) => {
    const tasks = acts.filter((a) => a.workstream_id === w.id && !a.exclude_from_report);
    const open = tasks.filter((a) => a.status !== "Closed");
    const pct = Math.round(Number(w.pct_complete ?? 0));
    const behind = Number(w.pct_planned ?? 0) - pct >= 10;
    const troubled = open.some((a) => a.status === "At Risk" || a.status === "Off Track" || (a.target_date && a.target_date < today));
    const weak = w.health_score != null && Number(w.health_score) < 55;
    const status: DashboardWorkstream["status"] =
      pct >= 100 || (tasks.length > 0 && open.length === 0) ? "Completed" : behind || troubled || weak ? "At Risk" : "Active";
    const nextMs = ms.find((m) => m.workstream_id === w.id && m.status !== "Complete" && m.forecast_date);
    const nextTask = open.find((a) => a.target_date);
    const gate = nextMs ? { text: nextMs.name, due: nextMs.forecast_date } : nextTask ? { text: nextTask.title, due: nextTask.target_date } : null;
    return {
      name: w.name,
      short: fit(w.name, 15),
      label: twoLines(w.name),
      pct,
      status,
      nextGate: gate ? fit(gate.text, 44) : undefined,
      due: gate?.due ?? undefined,
      target: short(gate?.due),
    };
  });
}

/** Status strip from milestones, for projects that track milestones only. */
function milestoneItems(ms: Milestone[]): DashboardWorkstream[] {
  // The strip holds 13: open milestones soonest first, topped up with the latest completed ones.
  const byDate = [...ms].sort((a, b) => a.forecastDate.localeCompare(b.forecastDate));
  const open = byDate.filter((m) => m.status !== "Complete");
  const done = byDate.filter((m) => m.status === "Complete");
  const pick = open.length >= 13 ? open.slice(0, 13) : [...done.slice(-(13 - open.length)), ...open];
  return pick
    .sort((a, b) => a.forecastDate.localeCompare(b.forecastDate))
    .map((m) => {
      const slip = days(m.baselineDate, m.forecastDate);
      const status: DashboardWorkstream["status"] =
        m.status === "Complete" ? "Completed" : m.status === "On Track" ? "Active" : "At Risk";
      return {
        name: m.name,
        short: fit(m.name, 15),
        label: twoLines(m.name),
        pct: m.status === "Complete" ? 100 : 0,
        status,
        valueText: m.status === "Complete" ? "Done" : m.status,
        nextGate: slip > 0 ? `+${slip} days vs. ${short(m.baselineDate)} baseline` : slip < 0 ? `${-slip} days early` : "On baseline",
        due: m.forecastDate,
        target: short(m.forecastDate),
      };
    });
}

function targetLabel(iso: string | undefined, now: Date): string {
  if (!iso) return "plan";
  const d = day(iso);
  const base = `${SHORT[d.getUTCMonth()]}. ${d.getUTCDate()}`;
  return d.getUTCFullYear() === now.getFullYear() ? base : `${base}, ${d.getUTCFullYear()}`;
}

function detailFor(p: Project, items: DashboardWorkstream[], unit: DetailSlide["unit"], raid: RaidItem[], asOf: string, now: Date): DetailSlide {
  const detail = demoDashboardDetail[p.id];
  const sn = shortName(p.name);
  const decision = p.decisionNeeded ?? openDecisions(raid.filter((r) => r.projectId === p.id))[0]?.title ?? null;
  const actions = p.recommendedActions ?? [];
  return {
    shortName: fit(sn, 18),
    headline: detail?.detailHeadline ?? fit(`${sn} is ${p.percentComplete}% complete and ${STATUS_WORD[p.status] ?? "in progress"}`, 64),
    sub: detail?.detailSub ?? fit(firstSentence(p.executiveSummary || ""), 140),
    pct: p.percentComplete,
    lastMonthPct: detail?.lastMonthPct ?? null,
    targetPct: 100,
    targetLabel: targetLabel(p.forecastCompletionDate || p.endDate, now),
    since: fit(p.weeklyChangeSummary || "No change reported this week.", 190),
    next: detail?.next ?? fit(actions.slice(0, 2).map((a) => a.replace(/[.\s]+$/, "")).join("; ") || "Continue to plan.", 150),
    callout: decision
      ? { label: "Decision needed", text: fit(decision, 120) }
      : { label: "Next action", text: fit(actions[0] ?? "No decisions outstanding.", 120) },
    asOf,
    unit,
    items,
  };
}

export async function buildGuestDeck(): Promise<Buffer> {
  const now = new Date();
  const asOf = `${LONG[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  const today = now.toISOString().slice(0, 10);
  const [projects, raid, milestones] = await Promise.all([getProjects(), getRaid(), getMilestones()]);
  if (!projects.length) throw new Error("No projects to report on");

  // Attention first: red, then amber, then green; weakest health first within each.
  const ordered = [...projects].sort(
    (a, b) => (STATUS_RANK[a.status] ?? 3) - (STATUS_RANK[b.status] ?? 3) || a.healthScore - b.healthScore,
  );

  const details: DetailSlide[] = [];
  for (const p of ordered) {
    const detail = demoDashboardDetail[p.id];
    let items: DashboardWorkstream[] = [];
    let unit: DetailSlide["unit"] = "workstreams";
    if (hasSupabase() && (await isDbProject(p.id))) {
      try { items = await databaseItems(p.id, today); } catch (e) { console.error("[guest-deck] workstreams", p.id, e); }
    } else if (detail) {
      items = detail.workstreams.map((w) => ({ ...w, target: short(w.due) }));
    }
    if (!items.length) {
      items = milestoneItems(milestones.filter((m) => m.projectId === p.id));
      unit = "milestones";
    }
    if (!items.length) items = [{ name: "Project", label: ["Project", ""], pct: p.percentComplete, status: "Active" }];
    // Wider cells when there are fewer than 13, so labels can be longer.
    if (!detail || unit === "milestones") {
      const per = Math.min(24, Math.round((11 * 13) / Math.min(Math.max(items.length, 1), 13)));
      items = items.map((w) => ({ ...w, label: twoLines(w.name, per) }));
    }
    details.push(detailFor(p, items, unit, raid, asOf, now));
  }

  // Portfolio summary slide
  const n = projects.length;
  const by = (s: string) => projects.filter((p) => p.status === s);
  const red = by("Red"), amber = by("Amber"), green = by("Green");
  const avg = Math.round(projects.reduce((s, p) => s + p.percentComplete, 0) / n);
  const doneMs = milestones.filter((m) => m.status === "Complete").length;
  const lateMs = milestones.filter((m) => m.status === "Late").length;
  const riskMs = milestones.filter((m) => m.status === "At Risk").length;
  const attention = red.length + amber.length;

  const decisions = openDecisions(raid);
  const priorities: SummarySlide["priorities"] = [];
  const used = new Set<string>();
  for (const d of decisions) {
    if (priorities.length >= 3 || used.has(d.projectId)) continue;
    const p = projects.find((x) => x.id === d.projectId);
    if (!p) continue;
    used.add(d.projectId);
    const who = d.owner && d.owner !== "—" ? `Owner ${d.owner}` : "";
    const when = d.dueDate ? `due ${short(d.dueDate)}${d.status === "Overdue" ? " (overdue)" : ""}` : "";
    const meta = [who, when].filter(Boolean).join(", ");
    const tail = meta ? ` ${meta.charAt(0).toUpperCase()}${meta.slice(1)}.` : "";
    priorities.push({ title: `${shortName(p.name)}: decision needed`, text: fit(`${d.title.replace(/[.\s]+$/, "")}.${tail}`, 115) });
  }
  for (const p of ordered) {
    if (priorities.length >= 3) break;
    if (used.has(p.id)) continue;
    const text = p.decisionNeeded ?? p.recommendedActions?.[0];
    if (!text) continue;
    used.add(p.id);
    priorities.push({ title: `${shortName(p.name)}: ${p.decisionNeeded ? "decision needed" : "next action"}`, text: fit(text, 115) });
  }

  const horizon = new Date(now.getTime() + 60 * 86_400_000).toISOString().slice(0, 10);
  const upcoming = milestones
    .filter((m) => m.status !== "Complete" && m.forecastDate >= today && m.forecastDate <= horizon)
    .sort((a, b) => a.forecastDate.localeCompare(b.forecastDate))
    .map((m) => `${shortName(projects.find((p) => p.id === m.projectId)?.name ?? "")} ${m.name} (${short(m.forecastDate)})`);

  const watch = [...projects].sort((a, b) => a.healthScore - b.healthScore).slice(0, 4);
  const summary: SummarySlide = {
    headline: fit(
      attention
        ? `Portfolio is ${avg}% complete; ${attention} of ${n} projects need attention`
        : `Portfolio is ${avg}% complete; all ${n} projects on track`,
      64,
    ),
    dateline: `${asOf} · ${n} projects`,
    tiles: [
      { label: "PROJECTS", value: String(n), sub: `${green.length} green · ${amber.length} amber · ${red.length} red` },
      { label: "COMPLETE", value: `${avg}%`, sub: "Average across projects" },
      { label: "MILESTONES DONE", value: `${doneMs} of ${milestones.length}`, sub: `${lateMs} late · ${riskMs} at risk` },
      { label: "AT RISK", value: String(red.length), sub: red.length ? fit(red.map((p) => shortName(p.name)).join(" · "), 40) : "No red projects" },
    ],
    chartTitle: "Watch list",
    bars: watch.map((p) => ({ name: fit(shortName(p.name), 15), pct: p.percentComplete, lastMonth: demoDashboardDetail[p.id]?.lastMonthPct ?? null })),
    priorities,
    nextLabel: "NEXT 60 DAYS",
    next: upcoming.length
      ? fit(upcoming.slice(0, 4).join(" · "), 125)
      : "No milestones fall due in the next 60 days; focus stays on the open decisions above.",
  };

  return buildPortfolioDashboard({
    title: "Portfolio Executive Dashboard",
    subtitle: `${n} projects · portfolio progress update`,
    asOf,
    summary,
    projects: details,
  });
}
