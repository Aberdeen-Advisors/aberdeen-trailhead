import Link from "next/link";
import { getPortfolioKpis, getProjects, getRaid } from "@/lib/data/provider";
import { HealthBadge, KpiCard, Panel, ScoreBar, fmtMoney } from "@/components/ui";
import { ProjectLogo } from "@/components/project-logo";

export const dynamic = "force-dynamic";

export default async function PortfolioHome() {
  const [kpis, projects, raid] = await Promise.all([getPortfolioKpis(), getProjects(), getRaid()]);
  const decisions = raid.filter((r) => r.type === "Decision" && r.status !== "Closed");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio Home</h1>
        <p className="mt-1 text-sm text-hv-muted">
          Certified KPIs from the Power BI Semantic Model · AI insights from Microsoft Fabric
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Executive Health" value={String(kpis.executiveHealthScore)} sub="portfolio score / 100" tone={kpis.executiveHealthScore >= 75 ? "good" : kpis.executiveHealthScore >= 55 ? "warn" : "bad"} />
        <KpiCard label="Projects" value={String(kpis.totalProjects)} sub={`${kpis.green} green · ${kpis.amber} amber · ${kpis.red} red`} />
        <KpiCard label="Budget" value={fmtMoney(kpis.totalBudget)} sub={`${fmtMoney(kpis.totalActuals)} actuals to date`} />
        <KpiCard label="Budget Variance" value={`${kpis.budgetVariancePct >= 0 ? "+" : ""}${kpis.budgetVariancePct.toFixed(1)}%`} sub="forecast at completion" tone={kpis.budgetVariancePct > 5 ? "bad" : kpis.budgetVariancePct > 0 ? "warn" : "good"} />
        <KpiCard label="Milestones" value={`${kpis.milestoneCompletionPct.toFixed(0)}%`} sub="baseline complete" />
        <KpiCard label="Open Decisions" value={String(kpis.openDecisions)} sub={`${kpis.openRaidCount} open RAID items`} tone={kpis.openDecisions > 2 ? "warn" : "default"} />
      </div>

      {/* AI portfolio summary */}
      <Panel title="AI Executive Summary — This Week">
        <p className="text-sm leading-relaxed text-hv-text">{kpis.portfolioSummary}</p>
        <p className="mt-3 text-xs text-hv-muted">
          Generated in Microsoft Fabric Notebooks · grounded in the HorizonView Intelligence Layer
        </p>
      </Panel>

      {/* Decisions needed */}
      {decisions.length > 0 && (
        <Panel title="Decisions Needed">
          <ul className="divide-y divide-hv-border">
            {decisions.map((d) => {
              const proj = projects.find((p) => p.id === d.projectId);
              return (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <div className="text-sm">{d.title}</div>
                    <div className="mt-0.5 text-xs text-hv-muted">
                      {proj?.name} · Owner: {d.owner} · Due {d.dueDate}
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${d.status === "Overdue" ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"}`}>
                    {d.status}
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {/* Project grid */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-hv-muted">Projects</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/portal/projects/${p.id}`}
              className="group rounded-xl border border-hv-border bg-hv-panel p-5 transition hover:border-hv-accent/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <ProjectLogo projectId={p.id} name={p.name} size={40} />
                  <div>
                    <div className="font-medium group-hover:text-hv-accent2">{p.name}</div>
                    <div className="mt-0.5 text-xs text-hv-muted">
                      {p.code} · {p.portfolio}
                    </div>
                  </div>
                </div>
                <HealthBadge status={p.status} />
              </div>
              <div className="mt-4 space-y-3">
                <ScoreBar label="Health" score={p.healthScore} />
                <div className="flex justify-between text-xs text-hv-muted">
                  <span>{p.phase} · {p.percentComplete}% complete</span>
                  <span>{fmtMoney(p.budget)}</span>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-hv-muted">{p.weeklyChangeSummary}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
