import type { HealthStatus } from "@/lib/types";

// One rule for project health everywhere in HorizonView: the status badge,
// the colour of the health bar, portfolio counts, the AI summary, SteerCo deck
// and podcast all come from the same 0–100 health score.
//   75 and above → Green · 50 to 74 → Amber · below 50 → Red
export const HEALTH_GREEN_AT = 75;
export const HEALTH_RED_BELOW = 50;

export function statusFromScore(score: number): HealthStatus {
  if (score >= HEALTH_GREEN_AT) return "Green";
  if (score < HEALTH_RED_BELOW) return "Red";
  return "Amber";
}

// ── Calculated health and % complete (projects kept in HorizonView) ─────────
// Nobody types a roll-up number: both come from the project's own plan,
// milestones, RAID log and weekly status.

export interface HealthInput {
  today: string; // YYYY-MM-DD
  startDate?: string | null;
  tasks: { status: string; start_date?: string | null; target_date?: string | null; pct_complete?: number | null; update_type?: string | null }[];
  milestones: { status: string; forecast_date?: string | null }[];
  raid: { type: string; severity: string; status: string; dueDate?: string }[];
  latestStatus?: string | null; // project-level weekly status: On Track / At Risk / Off Track
  lastStatusAt?: string | null; // when a weekly status was last entered or edited
}

const days = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);

/** % complete: duration-weighted progress of dated tasks and deliverables. */
export function calcPercentComplete(tasks: HealthInput["tasks"]): number | null {
  let total = 0;
  let done = 0;
  for (const t of tasks) {
    if (t.update_type && t.update_type !== "Task" && t.update_type !== "Deliverable") continue;
    if (!t.start_date || !t.target_date) continue;
    const d = Math.max(1, days(t.target_date, t.start_date) + 1);
    const pct = t.status === "Closed" ? 100 : Math.max(0, Math.min(100, Number(t.pct_complete ?? 0)));
    total += d;
    done += (d * pct) / 100;
  }
  return total ? Math.round((done / total) * 100) : null;
}

/** Health 0–100: starts at 100, points come off for what needs attention. */
export function calcHealth(i: HealthInput): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 100;
  const take = (n: number, cap: number, pts: number, what: (n: number) => string) => {
    if (n <= 0) return;
    const p = Math.min(cap, n * pts);
    score -= p;
    reasons.push(`${what(n)} (−${p})`);
  };
  const plural = (n: number, s: string) => `${n} ${s}${n === 1 ? "" : "s"}`;

  if (i.startDate && i.startDate > i.today) return { score: 100, reasons: ["Not started yet"] };

  const lateTasks = i.tasks.filter((t) => t.status !== "Closed" && t.target_date && t.target_date < i.today).length;
  take(lateTasks, 24, 4, (n) => `${plural(n, "task")} past finish date`);

  const lateMs = i.milestones.filter((m) => m.status === "Late" || (m.status !== "Complete" && m.forecast_date && m.forecast_date < i.today)).length;
  take(lateMs, 24, 8, (n) => `${plural(n, "milestone")} late`);
  const riskMs = i.milestones.filter((m) => m.status === "At Risk").length;
  take(riskMs, 9, 3, (n) => `${plural(n, "milestone")} at risk`);

  const open = i.raid.filter((r) => r.status !== "Closed");
  const overdueDec = open.filter((r) => r.type === "Decision" && r.status === "Overdue").length;
  take(overdueDec, 18, 6, (n) => `${plural(n, "decision")} overdue`);
  const highRi = open.filter((r) => (r.type === "Risk" || r.type === "Issue") && r.severity === "High").length;
  take(highRi, 12, 3, (n) => `${n} high-severity risk${n === 1 ? "" : "s"} or issue${n === 1 ? "" : "s"} open`);
  const otherOverdue = open.filter((r) => r.type !== "Decision" && r.status === "Overdue").length;
  take(otherOverdue, 10, 2, (n) => `${plural(n, "RAID item")} overdue`);

  if (i.latestStatus === "Off Track") take(1, 15, 15, () => "Latest weekly status is Off Track");
  else if (i.latestStatus === "At Risk") take(1, 7, 7, () => "Latest weekly status is At Risk");

  const sinceStart = i.startDate ? days(i.today, i.startDate) : 99;
  if (!i.lastStatusAt) {
    if (sinceStart > 7) take(1, 10, 10, () => "No weekly status entered yet");
  } else {
    const age = days(i.today, i.lastStatusAt.slice(0, 10));
    if (age > 14) take(1, 15, 15, () => `No status update in ${age} days`);
    else if (age > 7) take(1, 10, 10, () => `No status update in ${age} days`);
  }

  return { score: Math.max(0, Math.min(100, score)), reasons: reasons.length ? reasons : ["Nothing flagged"] };
}
