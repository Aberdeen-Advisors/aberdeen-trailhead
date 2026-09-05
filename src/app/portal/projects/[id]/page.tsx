import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, getRaid, getMilestones, isRaidEditable } from "@/lib/data/provider";
import { HealthBadge, KpiCard, Panel, ScoreBar, fmtMoney } from "@/components/ui";
import { GenerateDeckButton } from "@/components/generate-deck-button";
import { PodcastPanel } from "@/components/podcast-panel";
import { MilestoneGantt } from "@/components/milestone-gantt";
import { ProjectLogo } from "@/components/project-logo";
import { RaidEditor } from "@/components/raid-editor";
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
      {/* ── Project header band ─────────────────────────────────────────────*/}
      <section className="overflow-hidden rounded-hv bg-hv-hero shadow-hv">
        <div className="flex flex-wrap items-center justify-between gap-5 p-6 lg:p-7">
          <div className="flex min-w-0 items-center gap-4">
            <ProjectLogo projectId={project.id} name={project.name} size={56} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[1.6rem] font-bold tracking-tight text-white">{project.name}</h1>
                <HealthBadge status={project.status} />
              </div>
              <p className="hv-num mt-1.5 text-[0.8rem] font-light text-white/65">
                {project.code} · {project.portfolio} · PM {project.projectManager} · Sponsor{" "}
                {project.sponsor}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <GenerateDeckButton projectId={project.id} />
            <a
              href={project.sharePointUrl}
              target="_blank"
              rel="noreferrer"
              className="hv-btn whitespace-nowrap border-[1.5px] border-white/25 px-4 py-2 text-[0.82rem] text-white/85 transition hover:border-teal hover:text-white"
            >
              SharePoint ↗
            </a>
            <a
              href={project.powerBiReportUrl}
              target="_blank"
              rel="noreferrer"
              className="hv-btn whitespace-nowrap border-[1.5px] border-white/25 px-4 py-2 text-[0.82rem] text-white/85 transition hover:border-teal hover:text-white"
            >
              Power BI ↗
            </a>
          </div>
        </div>
      </section>

      {/* ── KPIs ────────────────────────────────────────────────────────────*/}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard lane="delivery" label="Phase" value={project.phase} sub={`${project.percentComplete}% complete`}>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-hv-border">
            <div
              className="h-full rounded-full bg-teal-bright"
              style={{ width: `${Math.min(project.percentComplete, 100)}%` }}
            />
          </div>
        </KpiCard>
        {project.budget > 0 ? (
          <>
            <KpiCard
              lane="intel"
              label="Budget"
              value={fmtMoney(project.budget)}
              sub={`${fmtMoney(project.actualsToDate)} actuals`}
            />
            <KpiCard
              lane="intel"
              label="Forecast at Completion"
              value={fmtMoney(project.forecastAtCompletion)}
              sub={`${variance >= 0 ? "+" : ""}${fmtMoney(variance)} vs budget`}
              tone={variance > 0 ? "warn" : "good"}
            />
          </>
        ) : (
          <>
            <KpiCard lane="intel" label="Budget" value="N/A" sub="Not tracked in source" />
            <KpiCard lane="intel" label="Forecast at Completion" value="N/A" sub="Not tracked in source" />
          </>
        )}
        <KpiCard lane="delivery" label="Baseline Finish" value={project.endDate} sub="approved baseline" />
        <KpiCard
          lane="intel"
          label="AI Forecast Finish"
          value={project.forecastCompletionDate}
          tone={project.forecastCompletionDate > project.endDate ? "bad" : "good"}
          sub={project.forecastCompletionDate > project.endDate ? "behind baseline · ML forecast" : "on baseline · ML forecast"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="AI Executive Summary">
            <p className="text-sm font-light leading-relaxed text-hv-text">{project.executiveSummary}</p>
          </Panel>

          <Panel title="Risk Narrative">
            <p className="text-sm font-light leading-relaxed text-hv-text">{project.riskNarrative}</p>
          </Panel>

          <Panel title="Recommended Actions (AI)">
            <ul className="space-y-3">
              {project.recommendedActions.map((a, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed text-hv-text">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-tint text-[0.7rem] font-bold text-teal-ink">
                    {i + 1}
                  </span>
                  {a}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Milestone Timeline"
            action={
              <span className="hv-num text-[0.72rem] text-hv-muted">
                {milestones.length} milestone{milestones.length === 1 ? "" : "s"}
              </span>
            }
          >
            <MilestoneGantt
              milestones={milestones}
              startDate={project.startDate}
              endDate={project.endDate}
              forecastEndDate={project.forecastCompletionDate}
            />
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Intelligence Scores">
            <div className="space-y-4">
              <ScoreBar label="Health score" score={project.healthScore} />
              <ScoreBar label="Schedule risk" score={project.scheduleRiskScore} invert />
              <ScoreBar label="Budget risk" score={project.budgetRiskScore} invert />
            </div>
            <p className="mt-4 border-t border-hv-border pt-3 text-[0.7rem] font-light text-hv-subtle">
              Scored nightly in Microsoft Fabric. Risk scales are inverted — lower is better.
            </p>
          </Panel>

          {project.decisionNeeded && (
            <section className="rounded-hv border border-amber-500/50 bg-amber-50 p-5 shadow-card">
              <h2 className="mb-3 flex items-center gap-2 border-b border-amber-500/30 pb-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Decision Needed
              </h2>
              <p className="text-sm leading-relaxed text-hv-text">{project.decisionNeeded}</p>
            </section>
          )}

          <Panel title="Weekly Change Summary">
            <p className="text-sm font-light leading-relaxed text-hv-muted">{project.weeklyChangeSummary}</p>
          </Panel>

          {/* Milestones live in the timeline in the main column now. */}
          <Panel title="Executive Podcast">
            <PodcastPanel projectId={project.id} podcastUrl={project.podcastUrl} enabled={tierHasPodcasts()} />
          </Panel>
        </div>
      </div>

      {/* Full width: the editable log needs the whole page for its columns. */}
      <RaidEditor projectId={project.id} items={raid} editable={isRaidEditable()} />

      <Link
        href="/portal"
        className="mx-auto block w-full max-w-xs rounded-full border border-hv-border bg-white py-2.5 text-center text-sm font-medium text-hv-muted transition hover:border-teal hover:text-teal-ink"
      >
        ← Back to portfolio
      </Link>
    </div>
  );
}
