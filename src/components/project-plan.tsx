"use client";

// Project plan on the project page: one Gantt with tasks (bars) and milestones
// (diamonds), with toggles to hide either. Reads the same Supabase tables the
// editable workspace writes to, and reloads when a table is saved there.

import { useCallback, useEffect, useState } from "react";
import { GanttChart, GanttLegend, type PlanMilestone, type PlanTask, type PlanWorkstream } from "@/components/gantt-chart";

type Data = { tasks: PlanTask[]; milestones: PlanMilestone[]; workstreams: PlanWorkstream[] };

async function load(projectId: string): Promise<Data> {
  const get = async (table: string) => {
    const res = await fetch(`/api/data/${table}?project=${encodeURIComponent(projectId)}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not load ${table} (${res.status})`);
    const j = await res.json();
    return (j.rows ?? j) as any[];
  };
  const [acts, ms, ws] = await Promise.all([get("activities"), get("milestones"), get("workstreams")]);
  return {
    // Hidden rows stay out of the plan; accomplishments etc. only show if they have dates.
    tasks: acts.filter((a) => !a.exclude_from_report) as PlanTask[],
    milestones: ms as PlanMilestone[],
    workstreams: [...ws].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)) as PlanWorkstream[],
  };
}

export function ProjectPlan({ projectId }: { projectId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTasks, setShowTasks] = useState(true);
  const [showMilestones, setShowMilestones] = useState(true);

  const refresh = useCallback(() => {
    load(projectId).then((d) => { setData(d); setError(null); }).catch((e) => setError(String(e.message ?? e)));
  }, [projectId]);

  useEffect(() => {
    refresh();
    const onChange = (e: Event) => {
      const d = (e as CustomEvent).detail ?? {};
      if (d.projectId === projectId && ["activities", "milestones", "workstreams"].includes(d.table)) refresh();
    };
    window.addEventListener("hv-data-changed", onChange);
    return () => window.removeEventListener("hv-data-changed", onChange);
  }, [projectId, refresh]);

  const scheduledTasks = data?.tasks.filter((t) => t.start_date || t.target_date).length ?? 0;
  const datedMs = data?.milestones.filter((m) => m.forecast_date).length ?? 0;

  const toggle = (on: boolean, set: (v: boolean) => void, label: string, count: number, other: boolean) => (
    <label className="inline-flex cursor-pointer select-none items-center gap-2 text-[0.78rem] text-hv-text">
      <input
        type="checkbox"
        checked={on}
        // Keep at least one layer visible.
        onChange={(e) => (e.target.checked || other) && set(e.target.checked)}
        className="h-4 w-4 accent-teal"
      />
      {label} <span className="hv-num text-hv-subtle">({count})</span>
    </label>
  );

  return (
    <section className="rounded-hv border border-hv-border bg-white p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-hv-border pb-3">
        <h2 className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-hv-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-teal" />
          Project Plan
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          {toggle(showTasks, setShowTasks, "Tasks", scheduledTasks, showMilestones)}
          {toggle(showMilestones, setShowMilestones, "Milestones", datedMs, showTasks)}
          <a
            href={`/print/projects/${encodeURIComponent(projectId)}`}
            target="_blank"
            rel="noreferrer"
            className="hv-btn whitespace-nowrap border-[1.5px] border-hv-border px-3 py-1.5 text-[0.75rem] font-semibold text-navy transition hover:border-teal hover:text-teal-ink"
          >
            Print / Save as PDF
          </a>
        </div>
      </div>

      {error && <p className="py-6 text-center text-sm text-red-500">{error}</p>}
      {!data && !error && <p className="py-8 text-center text-sm text-hv-subtle">Loading plan…</p>}
      {data && (
        <>
          <div className="max-h-[560px] overflow-auto rounded border border-hv-border">
            <GanttChart
              tasks={data.tasks}
              milestones={data.milestones}
              workstreams={data.workstreams}
              showTasks={showTasks}
              showMilestones={showMilestones}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <GanttLegend />
            <p className="text-[0.7rem] text-hv-subtle">Edit dates and progress in Tasks &amp; Activities and Milestones below.</p>
          </div>
        </>
      )}
    </section>
  );
}
