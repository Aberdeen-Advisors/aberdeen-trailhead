import Link from "next/link";
import { Suspense } from "react";
import { getPortfolioKpis, getProjects, getRaid, openDecisions } from "@/lib/data/provider";
import { PortfolioSummaryText, PortfolioSummarySkeleton } from "@/components/portfolio-summary";
import { HealthBadge, KpiCard, Panel, PageHeader, ScoreBar, SegmentBar, fmtMoney } from "@/components/ui";
import { ProjectLogo } from "@/components/project-logo";
import { StackLogos } from "@/components/stack-logos";
import { stackFor, stackDetail, type StackKey } from "@/lib/stacks";

export const dynamic = "force-dynamic";
// AI summaries can take several seconds to write on a cache miss.
export const maxDuration = 60;

export default async function PortfolioHome() {
  const [kpis, projects, raid] = await Promise.all([getPortfolioKpis(), getProjects(), getRaid()]);
  const spendPct = kpis.totalBudget > 0 ? Math.round((kpis.totalActuals / kpis.totalBudget) * 100) : 0;

  // Decisions Needed: one entry per project, from each project's own RAID log
  // (duplicates removed, most urgent first). Projects with overdue decisions lead.
  const decisions = openDecisions(raid);
  const decisionGroups = projects
    .map((p) => ({ project: p, items: decisions.filter((d) => d.projectId === p.id) }))
    .filter((g) => g.items.length > 0)
    .sort(
      (a, b) =>
        b.items.filter((d) => d.status === "Overdue").length - a.items.filter((d) => d.status === "Overdue").length ||
        a.project.healthScore - b.project.healthScore,
    );
  const overdueCount = decisions.filter((d) => d.status === "Overdue").length;
  const pill = (status: string) =>
    status === "Overdue"
      ? "border-red-500/35 bg-red-50 text-red-300"
      : "border-amber-500/50 bg-amber-50 text-amber-300";
  const meta = (d: (typeof decisions)[number]) =>
    [d.owner && d.owner !== "—" ? `Owner ${d.owner}` : "No owner assigned", d.dueDate ? `Due ${d.dueDate}` : "No due date"].join(" · ");

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Portfolio"
        title="Portfolio Home"
        sub="One view of the whole transformation portfolio, drawn live from each project's own systems: Power BI and SharePoint for Elevate, the HorizonView project database for Alpha."
      />

      {/* ── Executive band ──────────────────────────────────────────────────
          Borrows the marketing hero treatment so the portal opens on the same
          navy the client just saw on the website. */}
      <section className="overflow-hidden rounded-hv bg-hv-hero shadow-hv-lg">
        <div className="grid gap-8 p-7 lg:grid-cols-[1fr_360px] lg:p-9">
          <div className="min-w-0">
            <div className="hv-kicker-light mb-3">AI Executive Summary — This Week</div>
            <Suspense fallback={<PortfolioSummarySkeleton />}>
              <PortfolioSummaryText projects={projects} raid={raid} kpis={kpis} />
            </Suspense>
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
          label="Project Health"
          value={`${kpis.green}G · ${kpis.amber}A · ${kpis.red}R`}
        >
          <SegmentBar green={kpis.green} amber={kpis.amber} red={kpis.red} />
        </KpiCard>
        <KpiCard
          lane="intel"
          label="Budget"
          value={fmtMoney(kpis.totalBudget)}
          sub={`${fmtMoney(kpis.totalActuals)} spent · ${spendPct}% of budget`}
        />
        <KpiCard
          lane="intel"
          label="Budget Variance"
          value={`${kpis.budgetVariancePct >= 0 ? "+" : ""}${kpis.budgetVariancePct.toFixed(1)}%`}
          sub="forecast at completion vs budget"
          tone={kpis.budgetVariancePct > 5 ? "bad" : kpis.budgetVariancePct > 0 ? "warn" : "good"}
        />
        <KpiCard
          lane="delivery"
          label="Milestones"
          value={`${kpis.milestoneCompletionPct.toFixed(0)}%`}
          sub="of all milestones complete"
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
      {decisionGroups.length > 0 && (
        <Panel
          title="Decisions Needed"
          action={
            <span className="hv-num text-[0.72rem] text-hv-muted">
              {decisions.length} open across {decisionGroups.length} project{decisionGroups.length === 1 ? "" : "s"}
              {overdueCount > 0 && <span className="text-red-300"> · {overdueCount} overdue</span>}
            </span>
          }
        >
          <ul className="divide-y divide-hv-border">
            {decisionGroups.map(({ project: p, items }) => {
              const [top, ...rest] = items;
              return (
                <li key={p.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <ProjectLogo projectId={p.id} name={p.name} size={32} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/portal/projects/${p.id}`} className="text-[0.72rem] font-semibold uppercase tracking-wider text-teal-ink hover:underline">
                            {p.name}
                          </Link>
                          <HealthBadge status={p.status} />
                        </div>
                        <div className="mt-1 text-sm font-medium text-hv-text">{top.title}</div>
                        <div className="hv-num mt-0.5 text-xs text-hv-muted">{meta(top)}</div>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold ${pill(top.status)}`}>
                      {top.status}
                    </span>
                  </div>
                  {rest.length > 0 && (
                    <details className="group ml-11 mt-2">
                      <summary className="cursor-pointer list-none text-[0.72rem] font-semibold text-teal-ink hover:underline">
                        <span className="group-open:hidden">+ {rest.length} more decision{rest.length === 1 ? "" : "s"} on {p.name}</span>
                        <span className="hidden group-open:inline">Hide</span>
                      </summary>
                      <ul className="mt-2 space-y-2 border-l-2 border-hv-border pl-3">
                        {rest.map((d) => (
                          <li key={d.id} className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-[0.8rem] text-hv-text">{d.title}</div>
                              <div className="hv-num text-[0.7rem] text-hv-muted">{meta(d)}</div>
                            </div>
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${pill(d.status)}`}>
                              {d.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
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

              {stackFor(p.id).length > 0 && (
                <div className="mt-auto pt-3">
                  <div className="border-t border-hv-border pt-3">
                    <StackLogos
                      stack={stackFor(p.id)}
                      details={Object.fromEntries(stackFor(p.id).map((k) => [k, stackDetail(p.id, k)])) as Partial<Record<StackKey, string>>}
                    />
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
