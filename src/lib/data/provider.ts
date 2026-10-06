import { isDemoMode, hasPowerBi } from "@/lib/config";
import { demoProjects, demoRaid, demoMilestones, demoPortfolioSummary } from "@/lib/data/demo-data";
import { getLiveProjects, getLiveRaid, getLiveMilestones, ELEVATE_PROJECT_ID } from "@/lib/data/live-elevate";
import { applyRaidOverlay } from "@/lib/data/raid-store";
import { getModelLastRefresh, type ModelRefresh } from "@/lib/msft/powerbi";
import { hasSupabase, sbSelect } from "@/lib/supabase";
import { supabaseProjectIds } from "@/lib/stacks";
import type { RaidType } from "@/lib/types";
import { statusFromScore } from "@/lib/health";

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
  const ids = supabaseProjectIds();
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

// Project record (status, health, % complete, dates, budget and actuals) for
// Supabase projects. Merged over the sample record so the AI narrative fields
// remain; every number the KPIs, SteerCo deck and podcast use comes from the database.
const lastNum = (xs: (number | null)[]) => { for (let i = xs.length - 1; i >= 0; i--) if (xs[i] != null) return xs[i] as number; return 0; };
const toNum = (v: unknown) => (v == null || v === "" ? null : Number(v));
const sbHealth = (s: string): Project["status"] => (s === "Green" || s === "Red" ? s : "Amber");

async function overlaySbProjects(base: Project[]): Promise<Project[]> {
  const ids = supabaseProjectIds();
  if (!hasSupabase() || !ids.length) return base;
  try {
    const [rows, fin, ms, su, dec] = await Promise.all([
      sbSelect("projects", `id=in.(${ids.map(encodeURIComponent).join(",")})`),
      sbSelect("financials", `${inList(ids)}&order=month.asc`),
      sbSelect("milestones", `${inList(ids)}&order=forecast_date.asc.nullslast`),
      sbSelect("status_updates", `${inList(ids)}&workstream_id=is.null&order=week_of.desc,updated_at.desc`),
      sbSelect("raid_items", `${inList(ids)}&raid_type=eq.Decision&status=neq.Closed&order=due_date.asc.nullslast`),
    ]);
    const byId = new Map(rows.map((r: SbRow) => [r.id as string, r]));
    const out = base.map((p): Project => {
      const r = byId.get(p.id);
      if (!r) return p;
      // Financials are cumulative by month per workstream: take each workstream's latest value.
      const f = fin.filter((x: SbRow) => x.project_id === p.id);
      const sumLatest = (key: string) => {
        const by = new Map<string, (number | null)[]>();
        for (const x of f) { const k = String(x.workstream_id); if (!by.has(k)) by.set(k, []); by.get(k)!.push(toNum(x[key])); }
        let s = 0; by.forEach((v) => (s += lastNum(v))); return s * 1000;
      };
      const pms = ms.filter((m: SbRow) => m.project_id === p.id);
      const goLive: SbRow | undefined = pms.find((m: SbRow) => /go[- ]?live/i.test(m.name)) ?? pms[pms.length - 1];
      const latest: SbRow | undefined = su.find((s: SbRow) => s.project_id === p.id);
      // Decision Needed = the project's most urgent open decision in its RAID log.
      const decs = dec.filter((d: SbRow) => d.project_id === p.id)
        .sort((a: SbRow, b: SbRow) => decisionRank(sbStatus(a.status)) - decisionRank(sbStatus(b.status)));
      const topDec: SbRow | undefined = decs[0];
      return {
        ...p,
        name: r.name ?? p.name,
        code: r.code ?? p.code,
        portfolio: r.portfolio ?? p.portfolio,
        phase: r.phase ?? p.phase,
        status: sbHealth(r.status),
        sponsor: r.sponsor ?? p.sponsor,
        projectManager: r.project_manager ?? p.projectManager,
        startDate: r.start_date ?? p.startDate,
        endDate: r.end_date ?? p.endDate,
        healthScore: r.health_score ?? p.healthScore,
        percentComplete: r.percent_complete ?? p.percentComplete,
        budget: Number(r.budget) || p.budget,
        actualsToDate: f.length ? sumLatest("actual_k") : p.actualsToDate,
        forecastAtCompletion: f.length ? sumLatest("forecast_k") : p.forecastAtCompletion,
        forecastCompletionDate: goLive?.forecast_date ?? p.forecastCompletionDate,
        decisionNeeded: topDec
          ? [topDec.title, topDec.owner && `Owner ${topDec.owner}`, topDec.due_date && `due ${topDec.due_date}`].filter(Boolean).join(" · ")
          : null,
        weeklyChangeSummary: latest?.external_summary
          ? `Week of ${latest.week_of}: ${latest.external_summary}`
          : p.weeklyChangeSummary,
      };
    });
    return out;
  } catch (e) {
    console.error("[provider] Supabase project read failed; using sample data.", e);
    return base;
  }
}

export interface LastChange { at: string; by: string; table: string }

/** Most recent edit to a Supabase project's tables, from the change history. */
export async function getLastChange(projectId: string): Promise<LastChange | null> {
  if (!hasSupabase() || !supabaseProjectIds().includes(projectId)) return null;
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

export async function getProjects(): Promise<Project[]> {
  const projects = await overlaySbProjects(await mergedWithDemo("Projects", getLiveProjects, demoProjects));
  // Status always follows the health score (see lib/health.ts), whatever the source.
  return projects.map((p) => ({ ...p, status: statusFromScore(p.healthScore) }));
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
  const today = new Date().toISOString().slice(0, 10);
  items = items.map((r) => (r.status === "Open" && r.dueDate && r.dueDate < today ? { ...r, status: "Overdue" as const } : r));
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
  const items = await fromSupabase("milestones", base, loadSbMilestones, (m) => m.projectId);
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
  const sb = hasSupabase() ? projects.filter((p) => supabaseProjectIds().includes(p.id)) : [];
  const live = projects.filter((p) => p.id === ELEVATE_PROJECT_ID).length + sb.length;
  const rest = projects.length - live;
  const alpha = sb.map((p) => p.name).join(" and ");
  return (
    (alpha ? `${alpha} is live from its HorizonView project database. ` : "") +
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
