import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPortfolioKpis, getProjects, getRaid, getMilestones } from "@/lib/data/provider";
import { fmtMoney } from "@/lib/format";
import { renderSteerCoDeck, type DeckData, type DeckProject } from "@/lib/pptx/template-deck";
import type { Project, RaidItem, Milestone } from "@/lib/types";

// One-click Steering Committee deck, generated INSIDE the branded corporate
// template (Aberdeen Slide Template DOT_v2) via the tokenized skeleton in
// src/assets/. Long content spills onto continuation slides per project.

const cut = (s: string, n: number): string => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

// Per-slide capacity, set by the skeleton's box geometry.
const RISKS_PER = 4;
const ACTIONS_PER = 3;
const MILESTONES_PER = 12;
const MAX_PAGES = 4;

const chunk = <T,>(arr: T[], per: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += per) out.push(arr.slice(i, i + per));
  return out.length ? out : [[]];
};

const sevRank = { High: 0, Medium: 1, Low: 2 } as const;

function projectSlides(p: Project, raid: RaidItem[], milestones: Milestone[]): DeckProject[] {
  const risks = raid
    .filter((r) => r.projectId === p.id && r.status !== "Closed")
    .sort((a, b) => sevRank[a.severity] - sevRank[b.severity])
    .map((r) => `[${r.type}] ${cut(r.title, 70)} — ${r.severity}, due ${r.dueDate}${r.status === "Overdue" ? " (OVERDUE)" : ""}`);

  const actions = p.recommendedActions.map((a) => cut(a, 100));

  const ms = milestones
    .filter((m) => m.projectId === p.id)
    .map((m) => `${m.status === "Complete" ? "✓" : m.status === "Late" ? "✗" : "•"} ${cut(m.name, 42)} — ${m.forecastDate}`);

  const riskPages = chunk(risks, RISKS_PER);
  const actionPages = chunk(actions, ACTIONS_PER);
  const msPages = chunk(ms, MILESTONES_PER);
  const pages = Math.min(MAX_PAGES, Math.max(riskPages.length, actionPages.length, msPages.length));

  const leftover = (all: string[][], per: number): number =>
    all.slice(pages).reduce((s, c) => s + c.length, 0);

  const metaParts = [p.code, p.portfolio, p.phase, `${p.percentComplete}% complete`, `Health ${p.healthScore}`];
  if (p.budget > 0) metaParts.push(`Budget ${fmtMoney(p.budget)} (FAC ${fmtMoney(p.forecastAtCompletion)})`);
  if (p.forecastCompletionDate) metaParts.push(`Forecast finish ${p.forecastCompletionDate}`);

  return Array.from({ length: pages }, (_, i) => {
    const last = i === pages - 1;
    const withMore = (page: string[], all: string[][], label: string): string[] => {
      const extra = last ? leftover(all, 0) : 0;
      const items = page.length ? page : ["—"];
      return extra > 0 ? [...items, `… and ${extra} more ${label} (see portal)`] : items;
    };
    return {
      name: pages > 1 ? `${p.name} (${i + 1}/${pages})` : p.name,
      meta: metaParts.join(" · "),
      status: p.status,
      summary: i === 0 ? cut(p.executiveSummary, 420) : "Continued from previous slide.",
      risks: withMore(riskPages[i] ?? [], riskPages, "items"),
      actions: withMore(actionPages[i] ?? [], actionPages, "actions"),
      milestones: withMore(msPages[i] ?? [], msPages, "milestones"),
    };
  });
}

export async function buildSteeringDeck(projectId?: string): Promise<Buffer> {
  const [kpis, allProjects, raid, milestones] = await Promise.all([
    getPortfolioKpis(),
    getProjects(),
    getRaid(),
    getMilestones(),
  ]);
  const projects = projectId ? allProjects.filter((p) => p.id === projectId) : allProjects;
  const today = new Date().toISOString().slice(0, 10);

  const openDecisions = raid.filter((r) => r.type === "Decision" && r.status !== "Closed");

  const data: DeckData = {
    title: "HorizonView",
    subtitle: projectId
      ? `${projects[0]?.name ?? ""} — Steering Committee Update`
      : "Portfolio Steering Committee Update",
    date: `Generated ${today} · AI insights from Microsoft Fabric`,
    portfolio: projectId
      ? undefined
      : {
          kpis: [
            { label: "Executive Health", value: `${kpis.executiveHealthScore} / 100` },
            { label: "Projects", value: `${kpis.totalProjects}` },
            { label: "Green / Amber / Red", value: `${kpis.green} / ${kpis.amber} / ${kpis.red}` },
            { label: "Budget", value: fmtMoney(kpis.totalBudget) },
            { label: "Variance (FAC)", value: `${kpis.budgetVariancePct >= 0 ? "+" : ""}${kpis.budgetVariancePct.toFixed(1)}%` },
            { label: "Open Decisions", value: `${kpis.openDecisions}` },
          ],
          summary: cut(kpis.portfolioSummary, 700),
        },
    projects: projects.flatMap((p) => projectSlides(p, raid, milestones)),
    decisions: projectId
      ? undefined
      : openDecisions.slice(0, 10).map((d) => ({
          title: cut(d.title, 60),
          project: allProjects.find((p) => p.id === d.projectId)?.name ?? "",
          owner: d.owner,
          due: d.dueDate,
          status: d.status,
        })),
  };

  const skeleton = await readFile(path.join(process.cwd(), "src", "assets", "steerco-skeleton.pptx"));
  return renderSteerCoDeck(skeleton, data);
}
