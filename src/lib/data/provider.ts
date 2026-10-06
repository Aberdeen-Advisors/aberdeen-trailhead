import { isDemoMode, hasPowerBi } from "@/lib/config";
import { demoProjects, demoRaid, demoMilestones, demoPortfolioSummary } from "@/lib/data/demo-data";
import { getLiveProjects, getLiveRaid, getLiveMilestones, ELEVATE_PROJECT_ID } from "@/lib/data/live-elevate";
import { applyRaidOverlay } from "@/lib/data/raid-store";
import { getModelLastRefresh, type ModelRefresh } from "@/lib/msft/powerbi";
import { hasSupabase, sbSelect } from "@/lib/supabase";
import { fixedStackFor } from "@/lib/stacks";
import { dbProjects, dbProjectIds, isDbProject } from "@/lib/registry";
import type { RaidType } from "@/lib/types";
import { statusFromScore, calcHealth, calcPercentComplete } from "@/lib/health";
import { cookies } from "next/headers";

// "Hide sample projects" (a per-browser preference, set from Portfolio Home).
export const SAMPLES_COOKIE = "hv_hide_samples";
export function samplesHidden(): boolean {
  try {
    return cookies().get(SAMPLES_COOKIE)?.value === "1";
  } catch {
    return false; // outside a request (e.g. scheduled jobs)
  }
}

import type { Project, RaidItem, Milestone, PortfolioKpis } from "@/lib/types";

// ── Supabase-backed projects (e.g. Alpha) ────────────────────────────────────
// Their RAID log and milestones come from Supabase tables edited inside
// HorizonView, replacing the built-in sample rows. On any error the sample
// rows stay, so the portfolio never breaks.
type SbRow = Record<string, any>;
const sbRaidType = (t: string): RaidType =>
  (["Risk", "Assumption", "Issue", "Dependency", "Decision"] as RaidType[]).includes(t as RaidType) ? (t as RaidType) : "Issue";
const sbSeverity = (p: string): RaidItem["severity"] => (p === "Critical" || p === "High" ? "High" : p === "Low" ? "Low" : "Medium");
const sbStatus = (s: string): RaidItem["status"] =>
  s === "Closed" || s === "Overdue" || s === "In Progress" ? s : "Open";

async function fromSupabase<T>(label: string, base: T[], load: (ids: string[]) => Promise<T[]>, projectOf: (x: T) => string): Promise<T[]> {
  const ids = await dbProjectIds();
  if (!hasSupabase() || !ids.length) return base;
  try {
    const rows = await load(ids);
    return [...base.filter((x) => !ids.includes(projectOf(x))), ...rows];
  } catch (e) {
    console.error(`[provider] Supabase ${label} read failed; using sample data.`, e);
    return base;
  }
}

const inList = (ids: string[]) => `project_id=in.(${ids.map(encodeURIComponent).join(",")})`;

const loadSbRaid = async (ids: string[]): Promise<RaidItem[]> =>
  (await sbSelect("raid_items", `${inList(ids)}&order=created_at.asc`)).map((r: SbRow) => ({
    id: r.ref ?? r.id,
    projectId: r.project_id,
    type: sbRaidType(r.raid_type),
    title: r.title,
    severity: sbSeverity(r.priority),
    owner: r.owner ?? "",
    dueDate: r.due_date ?? "",
    status: sbStatus(r.status),
  }));

const loadSbMilestones = async (ids: string[]): Promise<Milestone[]> =>
  (await sbSelect("milestones", `${inList(ids)}&order=forecast_date.asc.nullslast`)).map((m: SbRow) => ({
    id: m.id,
    projectId: m.project_id,
    name: m.name,
    baselineDate: m.baseline_date ?? m.forecast_date ?? "",
    forecastDate: m.forecast_date ?? m.baseline_date ?? "",
    status: m.status,
  }));

// Projects kept in the HorizonView database: everything on the card, the KPIs,
// the SteerCo deck and the podcast is read from the database, and % complete
// and health are calculated from the project's own plan, milestones, RAID log
// and weekly status, so nobody types a roll-up number. Alpha also exists as a
// built-in sample; its sample narrative is kept until the AI rewrites it.
const lastNum = (xs: (number | null)[]) => { for (let i = xs.length - 1; i >= 0; i--) if (xs[i] != null) return xs[i] as number; return 0; };
const toNum = (v: unknown) => (v == null || v === "" ? null : Number(v));
const todayIso = () => new Date().toISOString().slice(0, 10);
const markOverdue = (r: RaidItem, today: string): RaidItem =>
  r.status === "Open" && r.dueDate && r.dueDate < today ? { ...r, status: "Overdue" } : r;
const mapSbRaid = (r: SbRow): RaidItem => ({
  id: r.ref ?? r.id,
  projectId: r.project_id,
  type: sbRaidType(r.raid_type),
  title: r.title,
  severity: sbSeverity(r.priority),
  owner: r.owner ?? "",
  dueDate: r.due_date ?? "",
  status: sbStatus(r.status),
});

async function withDbProjects(base: Project[]): Promise<Project[]> {
  const rows = await dbProjects();
  if (!rows.length) return base;
  const ids = rows.map((r) => String(r.id));
  try {
    const [fin, ms, su, raidRows, acts] = await Promise.all([
      sbSelect("financials", `${inList(ids)}&order=month.asc`),
      sbSelect("milestones", `${inList(ids)}&order=forecast_date.asc.nullslast`),
      sbSelect("status_updates", `${inList(ids)}&order=week_of.desc,updated_at.desc`),
      sbSelect("raid_items", `${inList(ids)}&order=due_date.asc.nullslast`),
      sbSelect("activities", `${inList(ids)}&select=project_id,status,start_date,target_date,pct_complete,update_type`),
    ]);
    const today = todayIso();
    const built = rows.map((r: SbRow): Project => {
      const id = String(r.id);
      const p = base.find((b) => b.id === id);
      // Financials are cumulative by month per workstream: take each workstream's latest value.
      const f = fin.filter((x: SbRow) => x.project_id === id);
      const sumLatest = (key: string) => {
        const by = new Map<string, (number | null)[]>();
        for (const x of f) { const k = String(x.workstream_id); if (!by.has(k)) by.set(k, []); by.get(k)!.push(toNum(x[key])); }
        let total = 0; by.forEach((v) => (total += lastNum(v))); return total * 1000;
      };
      const pms = ms.filter((m: SbRow) => m.project_id === id);
      const lastMs = [...pms].filter((m) => m.forecast_date).sort((a, b) => String(a.forecast_date).localeCompare(String(b.forecast_date))).pop();
      const goLive: SbRow | undefined = pms.find((m: SbRow) => /go[- ]?live/i.test(m.name)) ?? lastMs;
      const pSu = su.filter((x: SbRow) => x.project_id === id);
      const latestProject: SbRow | undefined = pSu.find((x: SbRow) => !x.workstream_id);
      const lastStatusAt = pSu.reduce<string | null>((acc, x) => {
        const t = String(x.updated_at ?? x.created_at ?? "");
        return !acc || t > acc ? t : acc;
      }, null);
      const pRaid = raidRows.filter((x: SbRow) => x.project_id === id).map(mapSbRaid).map((x) => markOverdue(x, today));
      const decs = pRaid.filter((d) => d.type === "Decision" && d.status !== "Closed")
        .sort((a, b) => decisionRank(a.status) - decisionRank(b.status) || (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
      const topDec = decs[0];
      const pActs = acts.filter((a: SbRow) => a.project_id === id);

      const health = calcHealth({
        today,
        startDate: r.start_date,
        tasks: pActs as any,
        milestones: pms as any,
        raid: pRaid,
        latestStatus: latestProject?.external_status ?? latestProject?.internal_status ?? null,
        lastStatusAt,
      });
      const pct = calcPercentComplete(pActs as any) ?? (r.percent_complete ?? 0);
      const budget = Number(r.budget) || 0;
      const actuals = f.length ? sumLatest("actual_k") : 0;
      const fac = f.length ? sumLatest("forecast_k") : budget;
      const endDate = r.end_date ?? p?.endDate ?? "";
      const forecastFinish = goLive?.forecast_date ?? endDate;
      const slipDays = forecastFinish && endDate ? Math.round((Date.parse(forecastFinish) - Date.parse(endDate)) / 86_400_000) : 0;

      return {
        id,
        name: r.name ?? p?.name ?? id,
        code: r.code ?? p?.code ?? "",
        portfolio: r.portfolio ?? p?.portfolio ?? "Unassigned",
        sponsor: r.sponsor ?? p?.sponsor ?? "—",
        projectManager: r.project_manager ?? p?.projectManager ?? "—",
        phase: r.phase ?? p?.phase ?? "Initiation",
        status: statusFromScore(health.score),
        percentComplete: pct,
        startDate: r.start_date ?? p?.startDate ?? "",
        endDate,
        healthScore: health.score,
        scheduleRiskScore: Math.max(0, Math.min(100, 100 - health.score + (slipDays > 0 ? 15 : 0))),
        budgetRiskScore: budget > 0 ? Math.max(0, Math.min(100, Math.round(20 + ((fac - budget) / budget) * 400))) : 0,
        forecastCompletionDate: forecastFinish,
        executiveSummary:
          p?.executiveSummary ??
          `${r.name} is ${pct}% complete with a health score of ${health.score}/100, running ${r.start_date} to ${endDate}. ${health.reasons.join("; ")}.`,
        riskNarrative: p?.riskNarrative ?? "",
        recommendedActions: p?.recommendedActions ?? [],
        weeklyChangeSummary: latestProject?.external_summary
          ? `Week of ${latestProject.week_of}: ${latestProject.external_summary}`
          : p?.weeklyChangeSummary ?? "No weekly status entered yet.",
        decisionNeeded: topDec
          ? [topDec.title, topDec.owner && `Owner ${topDec.owner}`, topDec.dueDate && `due ${topDec.dueDate}`].filter(Boolean).join(" · ")
          : null,
        podcastUrl: p?.podcastUrl ?? null,
        budget,
        actualsToDate: actuals,
        forecastAtCompletion: fac,
        sharePointUrl: "",
        powerBiReportUrl: "",
        source: "database",
        stack: Array.isArray(r.stack) ? r.stack : ["supabase", "htmldash", "entra"],
        healthReasons: health.reasons,
        description: r.description ?? null,
      };
    });
    return [...base.filter((b) => !ids.includes(b.id)), ...built];
  } catch (e) {
    console.error("[provider] Supabase project read failed; using sample data.", e);
    return base;
  }
}

export interface LastChange { at: string; by: string; table: string }

/** Most recent edit to a Supabase project's tables, from the change history. */
export async function getLastChange(projectId: string): Promise<LastChange | null> {
  if (!(await isDbProject(projectId))) return null;
  try {
    const [r] = await sbSelect("change_log", `project_id=eq.${encodeURIComponent(projectId)}&order=changed_at.desc&limit=1`);
    return r ? { at: String(r.changed_at), by: String(r.changed_by ?? ""), table: String(r.table_name) } : null;
  } catch {
    return null;
  }
}

// Single data access seam. Pages and API routes call these functions only.
// Demo mode serves mock data. Live mode queries the HorizonView Semantic Model
// (Project Elevate, via live-elevate.ts) and shows it ALONGSIDE the demo
// portfolio. If a live query fails, we log and serve demo data only.

// Local-only switch: on a developer machine (`next dev`), HV_LOCAL_LIVE_DATA=true
// pulls the real Power BI data while sign-in stays bypassed (demo mode). It can
// never take effect on Vercel, where NODE_ENV is always "production".
const localLiveData = (): boolean =>
  process.env.NODE_ENV === "development" && process.env.HV_LOCAL_LIVE_DATA === "true";

const useLiveData = (): boolean => (!isDemoMode() || localLiveData()) && hasPowerBi();

// In live mode, Project Elevate (live) leads and demo projects fill out the
// portfolio; on failure the portal degrades gracefully to demo only.
async function mergedWithDemo<T>(label: string, fetchLive: () => Promise<T[]>, demo: T[]): Promise<T[]> {
  if (!useLiveData()) return demo;
  try {
    const live = await fetchLive();
    return [...live, ...demo];
  } catch (e) {
    console.error(`[provider] Live query for '${label}' failed; serving demo data only.`, e);
    return demo;
  }
}

const sourceRank = { "semantic-model": 0, database: 1, demo: 2 } as const;

export async function getProjects(): Promise<Project[]> {
  const live = useLiveData();
  const merged = (await mergedWithDemo("Projects", getLiveProjects, demoProjects)).map((p): Project => ({
    ...p,
    source: live && p.id === ELEVATE_PROJECT_ID ? "semantic-model" : "demo",
    stack: fixedStackFor(p.id),
  }));
  let projects = await withDbProjects(merged);
  if (samplesHidden()) projects = projects.filter((p) => p.source !== "demo");
  // Live first (semantic model, then HorizonView database), samples last.
  // Status always follows the health score (see lib/health.ts), whatever the source.
  return projects
    .map((p, i) => ({ p: { ...p, status: statusFromScore(p.healthScore) }, i }))
    .sort((a, b) => sourceRank[a.p.source ?? "demo"] - sourceRank[b.p.source ?? "demo"] || a.i - b.i)
    .map((x) => x.p);
}

/** Sample projects that are hidden from this browser (empty unless the viewer chose to hide them). */
async function hiddenSampleIds(): Promise<string[]> {
  if (!samplesHidden()) return [];
  const db = await dbProjectIds();
  return demoProjects.map((p) => p.id).filter((id) => !db.includes(id));
}

export async function getProject(id: string): Promise<Project | undefined> {
  const projects = await getProjects();
  return projects.find((p) => p.id === id);
}

export async function getRaid(projectId?: string): Promise<RaidItem[]> {
  const base = await mergedWithDemo("RAID", getLiveRaid, demoRaid);
  // Portal edits are an overlay on the demo set (see raid-store.ts). Live rows
  // come from SharePoint/Power BI and are left untouched.
  // Local edits only ever apply to the sample projects. Elevate's rows come from
  // the SharePoint RAID Log list via the semantic model and are never overlaid.
  let items = base;
  if (isRaidEditable()) {
    const live = base.filter((r) => r.projectId === ELEVATE_PROJECT_ID);
    const demo = base.filter((r) => r.projectId !== ELEVATE_PROJECT_ID);
    const overlaid = (await applyRaidOverlay(demo)).filter((r) => r.projectId !== ELEVATE_PROJECT_ID);
    items = [...live, ...overlaid];
  }
  items = await fromSupabase("RAID", items, loadSbRaid, (r) => r.projectId);
  // One rule for every source: an open item whose due date has passed is Overdue.
  const today = todayIso();
  items = items.map((r) => markOverdue(r, today));
  const hidden = await hiddenSampleIds();
  if (hidden.length) items = items.filter((r) => !hidden.includes(r.projectId));
  return projectId ? items.filter((r) => r.projectId === projectId) : items;
}

/**
 * RAID is editable in demo mode only. In live mode the semantic model and
 * SharePoint Lists are the source of truth, so the portal stays read-only until
 * a Graph write-back exists.
 */
export const isRaidEditable = (): boolean => isDemoMode();

export async function getMilestones(projectId?: string): Promise<Milestone[]> {
  const base = await mergedWithDemo("Milestones", getLiveMilestones, demoMilestones);
  let items = await fromSupabase("milestones", base, loadSbMilestones, (m) => m.projectId);
  const hidden = await hiddenSampleIds();
  if (hidden.length) items = items.filter((m) => !hidden.includes(m.projectId));
  return projectId ? items.filter((m) => m.projectId === projectId) : items;
}

// Open decisions, one per distinct question per project: logs often repeat
// the same decision on several rows. Most urgent first (overdue, then due date).
const decisionRank = (s: string) => (s === "Overdue" ? 0 : s === "In Progress" ? 1 : 2);
export function openDecisions(raid: RaidItem[]): RaidItem[] {
  const seen = new Map<string, RaidItem>();
  const sorted = raid
    .filter((r) => r.type === "Decision" && r.status !== "Closed")
    .sort((a, b) => decisionRank(a.status) - decisionRank(b.status) || (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  for (const r of sorted) {
    const k = `${r.projectId}|${r.title.trim().toLowerCase()}`;
    if (!seen.has(k)) seen.set(k, r);
  }
  return Array.from(seen.values());
}

// Which projects on the portfolio are real data, for the end of the summary.
function liveNote(projects: Project[]): string {
  const sb = projects.filter((p) => p.source === "database");
  const rest = projects.filter((p) => p.source === "demo").length;
  const names = sb.map((p) => p.name);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
  return (
    (list ? `${list} ${names.length > 1 ? "are" : "is"} live from the HorizonView project database. ` : "") +
    (rest > 0 ? `The other ${rest} project${rest === 1 ? " is" : "s are"} demo data for illustration.` : "")
  ).trim();
}

export async function getPortfolioKpis(): Promise<PortfolioKpis> {
  const [projects, raid, milestones] = await Promise.all([getProjects(), getRaid(), getMilestones()]);
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalActuals = projects.reduce((s, p) => s + p.actualsToDate, 0);
  const totalFac = projects.reduce((s, p) => s + p.forecastAtCompletion, 0);
  const complete = milestones.filter((m) => m.status === "Complete").length;
  const liveProject = useLiveData() ? projects.find((p) => p.id === "elevate") : undefined;
  const green = projects.filter((p) => p.status === "Green").length;
  const amber = projects.filter((p) => p.status === "Amber").length;
  const red = projects.filter((p) => p.status === "Red").length;
  const health = Math.round(projects.reduce((s, p) => s + p.healthScore, 0) / (projects.length || 1));
  const openRaid = raid.filter((r) => r.status !== "Closed").length;
  const portfolioSummary = liveProject
    ? `The portfolio tracks ${projects.length} projects: ${green} Green, ${amber} Amber, ${red} Red, ` +
      `with an executive health score of ${health}/100 and ${openRaid} open RAID items. ` +
      `${liveProject.executiveSummary} ${liveNote(projects)}`
    : demoPortfolioSummary;
  return {
    totalProjects: projects.length,
    green,
    amber,
    red,
    totalBudget,
    totalActuals,
    budgetVariancePct: totalBudget ? ((totalFac - totalBudget) / totalBudget) * 100 : 0,
    milestoneCompletionPct: milestones.length ? (complete / milestones.length) * 100 : 0,
    openRaidCount: openRaid,
    openDecisions: openDecisions(raid).length,
    executiveHealthScore: health,
    portfolioSummary,
  };
}

/**
 * When the semantic model last refreshed from its sources (SharePoint Lists).
 * Null when the portal is on sample data or Power BI cannot be reached.
 */
export async function getDataFreshness(): Promise<ModelRefresh | null> {
  if (!useLiveData()) return null;
  try {
    return await getModelLastRefresh();
  } catch (e) {
    console.error("[provider] Could not read model refresh history.", e);
    return null;
  }
}
