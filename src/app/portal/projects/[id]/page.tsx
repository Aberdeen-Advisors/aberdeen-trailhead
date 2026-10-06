import Link from "next/link";
import { Suspense } from "react";
import { ProjectNarrativePanels, ProjectNarrativeSkeleton } from "@/components/project-narrative-panels";
import { notFound } from "next/navigation";
import { getProject, getRaid, getMilestones, isRaidEditable, getDataFreshness, getLastChange, openDecisions } from "@/lib/data/provider";
import { HealthBadge, KpiCard, Panel, ScoreBar, fmtMoney } from "@/components/ui";
import { GenerateDeckButton } from "@/components/generate-deck-button";
import { PodcastPanel } from "@/components/podcast-panel";
import { MilestoneTimeline } from "@/components/milestone-timeline";
import { SharePointLineage } from "@/components/sharepoint-lineage";
import { AutoRefresh } from "@/components/auto-refresh";
import { ProjectLogo } from "@/components/project-logo";
import { RaidEditor } from "@/components/raid-editor";
import { tierHasPodcasts } from "@/lib/config";
import { dashboardFor, usesMicrosoftStack, stackOf, isDatabaseProject, hasClientTemplate, projectDashboard } from "@/lib/stacks";
import { ProjectSettings } from "@/components/project-settings";
import { ProjectDataWorkspace } from "@/components/project-data-workspace";
import { hasSupabase } from "@/lib/supabase";
import { ProjectPlan } from "@/components/project-plan";
import { SupabaseLineage } from "@/components/supabase-lineage";
import { LiveSync } from "@/components/live-sync";

export const dynamic = "force-dynamic";
// AI summaries can take several seconds to write on a cache miss.
export const maxDuration = 60;

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const [project, raid, milestones] = await Promise.all([
    getProject(params.id),
    getRaid(params.id),
    getMilestones(params.id),
  ]);
  if (!project) notFound();

  const variance = project.forecastAtCompletion - project.budget;
  const today = new Date().toISOString().slice(0, 10);
  // A finish date in the past with work still open is flagged, not shown as on track.
  const finishPassed = !!project.forecastCompletionDate && project.forecastCompletionDate < today && project.percentComplete < 100;
  // Decision Needed: the project's own, or its most urgent open decision in the RAID log.
  const topDecision = openDecisions(raid)[0];
  const decisionNeeded =
    project.decisionNeeded ??
    (topDecision
      ? [topDecision.title, topDecision.owner && topDecision.owner !== "—" && `Owner ${topDecision.owner}`, topDecision.dueDate && `due ${topDecision.dueDate}`, topDecision.status === "Overdue" && "overdue"]
          .filter(Boolean)
          .join(" · ")
      : null);
  const dashboardUrl = dashboardFor(project);
  const dash = projectDashboard(project);
  const showMicrosoftLinks = usesMicrosoftStack(project);
  // Projects fed by SharePoint Lists are read-only here: edits happen in SharePoint.
  const fromSharePointLists = stackOf(project).includes("lists");
  const siteUrl = project.sharePointUrl || "https://aberdeenadv.sharepoint.com/sites/elevate";
  const freshness = fromSharePointLists ? await getDataFreshness() : null;
  // Projects kept in HorizonView show their full plan (Gantt) instead of the milestone timeline.
  const ownPlan = isDatabaseProject(project) && hasSupabase();
  const lastChange = ownPlan ? await getLastChange(project.id) : null;

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
                {project.source === "demo" && (
                  <span className="rounded-full border border-white/30 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-white/70">
                    Sample data
                  </span>
                )}
              </div>
              <p className="hv-num mt-1.5 text-[0.8rem] font-light text-white/65">
                {[
                  project.code,
                  project.portfolio,
                  project.projectManager && project.projectManager !== "—" && `PM ${project.projectManager}`,
                  project.sponsor && project.sponsor !== "—" && `Sponsor ${project.sponsor}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <GenerateDeckButton projectId={project.id} />
            {hasClientTemplate(project) && (
              <GenerateDeckButton
                projectId={project.id}
                endpoint="/api/reports/executive-dashboard"
                label="Executive Dashboard (client template)"
                variant="outline"
              />
            )}
            {ownPlan && (
              <ProjectSettings
                project={{
                  id: project.id,
                  name: project.name,
                  code: project.code,
                  portfolio: project.portfolio,
                  phase: project.phase,
                  sponsor: project.sponsor,
                  projectManager: project.projectManager,
                  startDate: project.startDate,
                  endDate: project.endDate,
                  budget: project.budget,
                  description: project.description ?? "",
                }}
              />
            )}
            {dashboardUrl && (
              <a
                href={dashboardUrl}
                target="_blank"
                rel="noreferrer"
                className="hv-btn whitespace-nowrap border-[1.5px] border-teal bg-teal/20 px-4 py-2 text-[0.82rem] font-semibold text-white transition hover:bg-teal/40"
              >
                Live dashboard ↗
              </a>
            )}
            {dash.kind === "internal" && (
              <Link
                href={dash.href}
                className="hv-btn whitespace-nowrap border-[1.5px] border-teal bg-teal/20 px-4 py-2 text-[0.82rem] font-semibold text-white transition hover:bg-teal/40"
              >
                Dashboard →
              </Link>
            )}
            {showMicrosoftLinks && (<>
            <a
              href={project.sharePointUrl}
              target="_blank"
              rel="noreferrer"
              className="hv-btn whitespace-nowrap border-[1.5px] border-white/25 px-4 py-2 text-[0.82rem] text-white/85 transition hover:border-teal hover:text-white"
            >
              SharePoint ↗
            </a>
            {dash.kind === "powerbi" && (
              <a
              href={project.powerBiReportUrl}
              target="_blank"
              rel="noreferrer"
              className="hv-btn whitespace-nowrap border-[1.5px] border-white/25 px-4 py-2 text-[0.82rem] text-white/85 transition hover:border-teal hover:text-white"
            >
              Power BI ↗
            </a>
            )}
            </>)}
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
          label="Forecast Finish"
          value={project.forecastCompletionDate || "—"}
          tone={finishPassed || project.forecastCompletionDate > project.endDate ? "bad" : "good"}
          sub={
            finishPassed
              ? `date passed · ${project.percentComplete}% complete`
              : project.forecastCompletionDate > project.endDate
                ? "behind baseline"
                : "on baseline"
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Suspense fallback={<ProjectNarrativeSkeleton />}>
            <ProjectNarrativePanels project={project} raid={raid} milestones={milestones} />
          </Suspense>

          {ownPlan && (
            <Panel title="Weekly Change Summary">
              <p className="text-sm font-light leading-relaxed text-hv-muted">{project.weeklyChangeSummary}</p>
            </Panel>
          )}

          {!ownPlan && (
          <Panel
            title="Milestone Timeline"
            action={
              <span className="flex items-center gap-3">
                <span className="hv-num text-[0.72rem] text-hv-muted">
                  {milestones.length} milestone{milestones.length === 1 ? "" : "s"}
                </span>
                <a
                  href={`/print/projects/${encodeURIComponent(project.id)}/milestones`}
                  target="_blank"
                  rel="noreferrer"
                  className="hv-btn whitespace-nowrap border-[1.5px] border-hv-border px-3 py-1 text-[0.72rem] font-semibold text-navy transition hover:border-teal hover:text-teal-ink"
                >
                  Print / Save as PDF
                </a>
              </span>
            }
          >
            <MilestoneTimeline
              milestones={milestones}
              startDate={project.startDate}
              endDate={project.endDate}
              forecastEndDate={project.forecastCompletionDate}
            />
          </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel title="Intelligence Scores">
            <div className="space-y-4">
              <ScoreBar label="Health score" score={project.healthScore} />
              <ScoreBar label="Schedule risk" score={project.scheduleRiskScore} invert />
              {project.budget > 0 && <ScoreBar label="Budget risk" score={project.budgetRiskScore} invert />}
            </div>
            <p className="mt-4 border-t border-hv-border pt-3 text-[0.7rem] font-light text-hv-subtle">
              {ownPlan
                ? "Health and % complete are calculated from this project's plan, milestones, RAID log and weekly status."
                : fromSharePointLists
                  ? "Health score is the average of your workstream statuses in the semantic model (Green 85, Amber 65, Red 40); schedule risk is 100 minus health."
                  : "Scored nightly in Microsoft Fabric."}{" "}
              Risk scales are inverted — lower is better.
            </p>
            {ownPlan && project.healthReasons && project.healthReasons.length > 0 && (
              <div className="mt-3 rounded-lg bg-hv-bg p-3">
                <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-hv-subtle">Why {project.healthScore}</div>
                <ul className="mt-1.5 space-y-1 text-[0.72rem] text-hv-muted">
                  {project.healthReasons.map((r) => (
                    <li key={r} className="flex gap-1.5">
                      <span className="text-teal-ink">·</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          {decisionNeeded && (
            <section className="rounded-hv border border-amber-500/50 bg-amber-50 p-5 shadow-card">
              <h2 className="mb-3 flex items-center gap-2 border-b border-amber-500/30 pb-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Decision Needed
              </h2>
              <p className="text-sm leading-relaxed text-hv-text">{decisionNeeded}</p>
            </section>
          )}

          {!ownPlan && (
            <Panel title="Weekly Change Summary">
              <p className="text-sm font-light leading-relaxed text-hv-muted">{project.weeklyChangeSummary}</p>
            </Panel>
          )}

          {/* Milestones live in the timeline in the main column now. */}
          <Panel title="Executive Podcast">
            <PodcastPanel projectId={project.id} podcastUrl={project.podcastUrl} enabled={tierHasPodcasts()} />
          </Panel>
        </div>
      </div>

      {ownPlan && <ProjectPlan projectId={project.id} />}

      {/* Full width: the editable log needs the whole page for its columns. */}
      {ownPlan ? (
        <ProjectDataWorkspace projectId={project.id} dashboardUrl={dashboardUrl} />
      ) : (
      <RaidEditor
        projectId={project.id}
        items={raid}
        editable={isRaidEditable() && !fromSharePointLists}
        sourceLabel={fromSharePointLists ? "RAID Log" : undefined}
        sourceUrl={fromSharePointLists ? `${siteUrl}/Lists/RaidLog/AllItems.aspx` : undefined}
      />
      )}

      {ownPlan && (
        <>
          <SupabaseLineage projectName={project.name} lastChange={lastChange} dashboardUrl={dashboardUrl} />
          <LiveSync projectId={project.id} />
        </>
      )}

      {fromSharePointLists && (
        <>
          <SharePointLineage siteUrl={siteUrl} freshness={freshness} cadence="every hour" staleAfterMins={120} />
          <AutoRefresh everyMs={5 * 60_000} />
        </>
      )}

      <Link
        href="/portal"
        className="mx-auto block w-full max-w-xs rounded-full border border-hv-border bg-white py-2.5 text-center text-sm font-medium text-hv-muted transition hover:border-teal hover:text-teal-ink"
      >
        ← Back to portfolio
      </Link>
    </div>
  );
}
