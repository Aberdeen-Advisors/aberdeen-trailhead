import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, getRaid, getMilestones } from "@/lib/data/provider";
import { HealthBadge, KpiCard, MilestoneStatusLabel, Panel, ScoreBar, fmtMoney } from "@/components/ui";
import { GenerateDeckButton } from "@/components/generate-deck-button";
import { PodcastPanel } from "@/components/podcast-panel";
import { ProjectLogo } from "@/components/project-logo";
import { tierHasPodcasts } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const [project, raid, milestones] = await Promise.all([
    getProject(params.id),
    getRaid(params.id),
    getMilestones(params.id),
  ]);
  if (!project) notFound();

  const variance = project.forecastAtCompletion - project.budget;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <ProjectLogo projectId={project.id} name={project.name} size={56} />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
              <HealthBadge status={project.status} />
            </div>
            <p className="mt-1 text-sm text-hv-muted">
              {project.code} · {project.portfolio} · PM: {project.projectManager} · Sponsor: {project.sponsor}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <GenerateDeckButton projectId={project.id} />
          <a href={project.sharePointUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-hv-border px-3 py-2 text-sm text-hv-muted transition hover:text-hv-text">
            SharePoint Site
          </a>
          <a href={project.powerBiReportUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-hv-border px-3 py-2 text-sm text-hv-muted transition hover:text-hv-text">
            Power BI Report
          </a>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
        <KpiCard label="Phase" value={project.phase} sub={`${project.percentComplete}% complete`} />
        {project.budget > 0 ? (
          <>
            <KpiCard label="Budget" value={fmtMoney(project.budget)} sub={`${fmtMoney(project.actualsToDate)} actuals`} />
            <KpiCard label="Forecast at Completion" value={fmtMoney(project.forecastAtCompletion)} sub={`${variance >= 0 ? "+" : ""}${fmtMoney(variance)} vs budget`} tone={variance > 0 ? "warn" : "good"} />
          </>
        ) : (
          <>
            <KpiCard label="Budget" value="N/A" sub="Not tracked in source" />
            <KpiCard label="Forecast at Completion" value="N/A" sub="Not tracked in source" />
          </>
        )}
        <KpiCard label="Baseline Finish" value={project.endDate} />
        <KpiCard label="AI Forecast Finish" value={project.forecastCompletionDate} tone={project.forecastCompletionDate > project.endDate ? "bad" : "good"} sub="ML forecast (Fabric)" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* AI narrative */}
          <Panel title="AI Executive Summary">
            <p className="text-sm leading-relaxed">{project.executiveSummary}</p>
          </Panel>
          <Panel title="Risk Narrative">
            <p className="text-sm leading-relaxed">{project.riskNarrative}</p>
          </Panel>
          <Panel title="Recommended Actions (AI)">
            <ul className="space-y-2">
              {project.recommendedActions.map((a, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="mt-0.5 text-hv-accent2">→</span>
                  {a}
                </li>
              ))}
            </ul>
          </Panel>
          {/* RAID */}
          <Panel title="RAID Log">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-hv-border text-xs uppercase tracking-wider text-hv-muted">
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Item</th>
                    <th className="py-2 pr-4">Severity</th>
                    <th className="py-2 pr-4">Owner</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hv-border">
                  {raid.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2.5 pr-4 text-hv-muted">{r.type}</td>
                      <td className="py-2.5 pr-4">{r.title}</td>
                      <td className={`py-2.5 pr-4 ${r.severity === "High" ? "text-red-400" : r.severity === "Medium" ? "text-amber-400" : "text-hv-muted"}`}>{r.severity}</td>
                      <td className="py-2.5 pr-4 text-hv-muted">{r.owner}</td>
                      <td className={`py-2.5 ${r.status === "Overdue" ? "text-red-400" : "text-hv-muted"}`}>{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          {/* Scores */}
          <Panel title="Intelligence Scores">
            <div className="space-y-4">
              <ScoreBar label="Health Score" score={project.healthScore} />
              <ScoreBar label="Schedule Risk" score={project.scheduleRiskScore} invert />
              <ScoreBar label="Budget Risk" score={project.budgetRiskScore} invert />
            </div>
          </Panel>
          {/* Decision needed */}
          {project.decisionNeeded && (
            <Panel title="Decision Needed">
              <p className="text-sm leading-relaxed text-amber-300">{project.decisionNeeded}</p>
            </Panel>
          )}
          {/* Weekly change */}
          <Panel title="Weekly Change Summary">
            <p className="text-sm leading-relaxed text-hv-muted">{project.weeklyChangeSummary}</p>
          </Panel>
          {/* Milestones */}
          <Panel title="Milestones">
            <ul className="space-y-3">
              {milestones.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                  <div>
                    <div>{m.name}</div>
                    <div className="text-xs text-hv-muted">
                      Baseline {m.baselineDate}
                      {m.forecastDate !== m.baselineDate && ` · Forecast ${m.forecastDate}`}
                    </div>
                  </div>
                  <MilestoneStatusLabel status={m.status} />
                </li>
              ))}
            </ul>
          </Panel>
          {/* Podcast */}
          <Panel title="Executive Podcast">
            <PodcastPanel
              projectId={project.id}
              podcastUrl={project.podcastUrl}
              enabled={tierHasPodcasts()}
            />
          </Panel>
          <Link href="/portal" className="block text-center text-sm text-hv-muted transition hover:text-hv-text">
            ← Back to portfolio
          </Link>
        </div>
      </div>
    </div>
  );
}
