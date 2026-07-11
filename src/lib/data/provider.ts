import { isDemoMode, hasPowerBi } from "@/lib/config";
import { demoProjects, demoRaid, demoMilestones, demoPortfolioSummary } from "@/lib/data/demo-data";
import { getLiveProjects, getLiveRaid, getLiveMilestones } from "@/lib/data/live-elevate";
import type { Project, RaidItem, Milestone, PortfolioKpis } from "@/lib/types";

// Single data access seam. Pages and API routes call these functions only.
// Demo mode serves mock data. Live mode queries the HorizonView Semantic Model
// (Project Elevate, via live-elevate.ts) and shows it ALONGSIDE the demo
// portfolio. If a live query fails, we log and serve demo data only.

const useLiveData = (): boolean => !isDemoMode() && hasPowerBi();

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
  return mergedWithDemo("Projects", getLiveProjects, demoProjects);
}

export async function getProject(id: string): Promise<Project | undefined> {
  const projects = await getProjects();
  return projects.find((p) => p.id === id);
}

export async function getRaid(projectId?: string): Promise<RaidItem[]> {
  const items = await mergedWithDemo("RAID", getLiveRaid, demoRaid);
  return projectId ? items.filter((r) => r.projectId === projectId) : items;
}

export async function getMilestones(projectId?: string): Promise<Milestone[]> {
  const items = await mergedWithDemo("Milestones", getLiveMilestones, demoMilestones);
  return projectId ? items.filter((m) => m.projectId === projectId) : items;
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
      `${liveProject.executiveSummary} Remaining projects shown are demo data for illustration.`
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
    openDecisions: raid.filter((r) => r.type === "Decision" && r.status !== "Closed").length,
    executiveHealthScore: health,
    portfolioSummary,
  };
}
