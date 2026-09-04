import Link from "next/link";
import { getPortfolioKpis, getProjects, getRaid } from "@/lib/data/provider";
import { HealthBadge, KpiCard, Panel, PageHeader, ScoreBar, SegmentBar, fmtMoney } from "@/components/ui";
import { ProjectLogo } from "@/components/project-logo";

export const dynamic = "force-dynamic";

export default async function PortfolioHome() {
  const [kpis, projects, raid] = await Promise.all([getPortfolioKpis(), getProjects(), getRaid()]);
  const decisions = raid.filter((r) => r.type === "Decision" && r.status !== "Closed");
  const spendPct = kpis.totalBudget > 0 ? Math.round((kpis.totalActuals / kpis.totalBudget) * 100) : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Portfolio"
        title="Portfolio Home"
        sub="One cockpit for the enterprise-wide transformation portfolio — certified KPIs from the Power BI Semantic Model, with AI insights generated in Microsoft Fabric."
      />

      {/* ── Executive band ──────────────────────────────────────────────────
          Borrows the marketing hero treatment so the portal opens on the same
          navy the client just saw on the website. */}
      <section className="overflow-hidden rounded-hv bg-hv-hero shadow-hv-lg">
        <div className="grid gap-8 p-7 lg:grid-cols-[1fr_360px] lg:p-9">
          <div className="min-w-0">
            <div className="hv-kicker-light mb-3">AI Executive Summary — This Week</div>
            <p className="text-[0.98rem] font-light leading-relaxed text-white/90">{kpis.portfolioSummary}</p>
            <p className="mt-5 border-t border-white/15 pt-4 text-[0.72rem] font-light text-white/50">
              Generated in Microsoft Fabric Notebooks · grounded in the HorizonView Intelligence Layer
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 self-center">
            <div className="col-span-2 rounded-xl bg-white/[0.07] p-4 backdrop-blur-sm">
              <div className="text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-white/55">
                Executive Health
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="hv-num text-[2.6rem] font-bold leading-none text-teal">
                  {kpis.executiveHealthScore}
                </span>
                <span className="hv-num text-sm text-white/50">/ 100</span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-teal-bright"
                  style={{ width: `${Math.min(kpis.executiveHealthScore, 100)}%` }}
                />
              </div>
            </div>
            <div className="rounded-xl bg-white/[0.07] p-4 backdrop-blur-sm">
              <div className="text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-white/55">Projects</div>
              <div className="hv-num mt-1 text-2xl font-bold text-white">{kpis.totalProjects}</div>
              <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-white/15">
                <span className="bg-emerald-500" style={{ width: `${(kpis.green / kpis.totalProjects) * 100}%` }} />
                <span className="bg-amber-500" style={{ width: `${(kpis.amber / kpis.totalProjects) * 100}%` }} />
                <span className="bg-red-500" style={{ width: `${(kpis.red / kpis.totalProjects) * 100}%` }} />
              </div>
            </div>
            <div className="rounded-xl bg-white/[0.07] p-4 backdrop-blur-sm">
              <div className="text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-white/55">Decisions</div>
              <div className="hv-num mt-1 text-2xl font-bold text-white">{kpis.openDecisions}</div>
              <div className="hv-num mt-2 text-[0.68rem] text-white/50">{kpis.openRaidCount} open RAID</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── KPI row ─────────────────────────────────────────────────────────*/}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          lane="delivery"
          label="Workstream Health"
          value={`${kpis.green}G · ${kpis.amber}A · ${kpis.red}R`}
        >
          <SegmentBar green={kpis.green} amber={kpis.amber} red={kpis.red} />
        </KpiCard>
        <KpiCard
          lane="intel"
          label="Budget"
          value={fmtMoney(kpis.totalBudget)}
          sub={`${fmtMoney(kpis.totalActuals)} actuals · ${spendPct}% of plan`}
        />
        <KpiCard
          lane="intel"
          label="Budget Variance"
          value={`${kpis.budgetVariancePct >= 0 ? "+" : ""}${kpis.budgetVariancePct.toFixed(1)}%`}
          sub="forecast at completion"
          tone={kpis.budgetVariancePct > 5 ? "bad" : kpis.budgetVariancePct > 0 ? "warn" : "good"}
        />
        <KpiCard
          lane="delivery"
          label="Milestones"
          value={`${kpis.milestoneCompletionPct.toFixed(0)}%`}
          sub="baseline complete"
        >
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-hv-border">
            <div
              className="h-full rounded-full bg-navy"
              style={{ width: `${Math.min(kpis.milestoneCompletionPct, 100)}%` }}
            />
          </div>
        </KpiCard>
        <KpiCard
          lane="intel"
          label="Open Decisions"
          value={String(kpis.openDecisions)}
          sub={`${kpis.openRaidCount} open RAID items`}
          tone={kpis.openDecisions > 2 ? "warn" : "default"}
        />
      </div>

      {/* ── Decisions needed ────────────────────────────────────────────────*/}
      {decisions.length > 0 && (
        <Panel
          title="Decisions Needed"
          action={
            <span className="hv-num text-[0.72rem] text-hv-muted">
              {decisions.filter((d) => d.status === "Overdue").length} overdue
            </span>
          }
        >
          <ul className="divide-y divide-hv-border">
            {decisions.map((d) => {
              const proj = projects.find((p) => p.id === d.projectId);
              const overdue = d.status === "Overdue";
              return (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${overdue ? "bg-red-500" : "bg-amber-500"}`}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-hv-text">{d.title}</div>
                      <div className="hv-num mt-1 text-xs text-hv-muted">
                        {proj?.name} · Owner {d.owner} · Due {d.dueDate}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold ${
                      overdue
                        ? "border-red-500/35 bg-red-50 text-red-300"
                        : "border-amber-500/50 bg-amber-50 text-amber-300"
                    }`}
                  >
                    {d.status}
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {/* ── Project grid ────────────────────────────────────────────────────*/}
      <div>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="hv-kicker">Projects</h2>
          <span className="hv-num text-[0.72rem] text-hv-muted">{projects.length} active</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/portal/projects/${p.id}`}
              className="hv-card hv-lift group flex flex-col p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <ProjectLogo projectId={p.id} name={p.name} size={40} />
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-navy transition group-hover:text-teal-ink">
                      {p.name}
                    </div>
                    <div className="hv-num mt-0.5 truncate text-xs text-hv-muted">
                      {p.code} · {p.portfolio}
                    </div>
                  </div>
                </div>
                <HealthBadge status={p.status} />
              </div>

              <div className="mt-4 space-y-3">
                <ScoreBar label="Health score" score={p.healthScore} />
                <div className="hv-num flex justify-between text-xs text-hv-muted">
                  <span>
                    {p.phase} · {p.percentComplete}% complete
                  </span>
                  <span className="font-semibold text-navy">{fmtMoney(p.budget)}</span>
                </div>
              </div>

              <p className="mt-4 line-clamp-2 border-t border-hv-border pt-3 text-xs font-light leading-relaxed text-hv-muted">
                {p.weeklyChangeSummary}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
