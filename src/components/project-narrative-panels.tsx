import { Panel } from "@/components/ui";
import { LocalTime } from "@/components/local-time";
import { getProjectNarrative } from "@/lib/ai/project-narrative";
import type { Milestone, Project, RaidItem } from "@/lib/types";

// Executive Summary, Risk Narrative and Recommended Actions on a project page.
// Live projects get an AI narrative written from their current data (rendered
// inside <Suspense> so the rest of the page shows at once); demo projects show
// their sample text.

function Actions({ items }: { items: string[] }) {
  const row = (a: string, i: number) => (
    <li key={i} className="flex gap-3 text-sm leading-relaxed text-hv-text">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-tint text-[0.7rem] font-bold text-teal-ink">
        {i + 1}
      </span>
      {a}
    </li>
  );
  const top = items.slice(0, 5);
  const more = items.slice(5);
  return (
    <>
      <ul className="space-y-3">{top.map(row)}</ul>
      {more.length > 0 && (
        <details className="group mt-3">
          <summary className="cursor-pointer list-none text-[0.75rem] font-semibold text-teal-ink hover:underline">
            <span className="group-open:hidden">Show {more.length} more</span>
            <span className="hidden group-open:inline">Show fewer</span>
          </summary>
          <ul className="mt-3 space-y-3">{more.map((a, i) => row(a, i + 5))}</ul>
        </details>
      )}
    </>
  );
}

export async function ProjectNarrativePanels({
  project,
  raid,
  milestones,
}: {
  project: Project;
  raid: RaidItem[];
  milestones: Milestone[];
}) {
  const n = await getProjectNarrative(project, raid, milestones);
  const ai = !!n;
  const summary = n?.executiveSummary ?? project.executiveSummary;
  const risk = n?.riskNarrative || project.riskNarrative;
  const actions = n?.recommendedActions ?? project.recommendedActions;
  return (
    <>
      <Panel title={ai ? "AI Executive Summary" : "Executive Summary"}>
        <p className="text-sm font-light leading-relaxed text-hv-text">{summary}</p>
        {ai && (
          <p className="mt-3 text-[0.68rem] text-hv-subtle">
            Written by AI from this project&apos;s current data · <LocalTime iso={n!.generatedAt} /> · the SteerCo deck and podcast use the same text
          </p>
        )}
      </Panel>
      {risk && (
        <Panel title="Risk Narrative">
          <p className="text-sm font-light leading-relaxed text-hv-text">{risk}</p>
        </Panel>
      )}
      {actions.length > 0 && (
        <Panel title={ai ? "Recommended Actions (AI)" : "Recommended Actions"}>
          <Actions items={actions} />
        </Panel>
      )}
    </>
  );
}

export function ProjectNarrativeSkeleton() {
  const bars = (ws: number[]) => (
    <div className="space-y-2">
      {ws.map((w, i) => (
        <div key={i} className="h-3 animate-pulse rounded bg-hv-border" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
  return (
    <>
      <Panel title="AI Executive Summary">
        {bars([100, 94, 97, 60])}
        <p className="mt-3 text-[0.68rem] text-hv-subtle">AI is reading this project&apos;s latest data…</p>
      </Panel>
      <Panel title="Risk Narrative">{bars([100, 90, 70])}</Panel>
      <Panel title="Recommended Actions (AI)">{bars([85, 80, 75])}</Panel>
    </>
  );
}
