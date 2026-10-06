"use client";

import { useMemo, useState } from "react";
import type { Milestone } from "@/lib/types";
import { MilestoneGantt } from "@/components/milestone-gantt";

// Wraps the Gantt so a project with dozens of milestones stays readable:
// a status summary, a few focused views, and at most CAP rows until expanded.

const CAP = 12;

type View = "attention" | "risk" | "all";

const VIEWS: { id: View; label: string }[] = [
  { id: "attention", label: "Needs attention" },
  { id: "risk", label: "Late & at risk" },
  { id: "all", label: "All" },
];

const STATUS_ORDER: Milestone["status"][] = ["Late", "At Risk", "On Track", "Complete"];
const STATUS_DOT: Record<Milestone["status"], string> = {
  Late: "#DB504A",
  "At Risk": "#F7D002",
  "On Track": "#5CC8FF",
  Complete: "#00A676",
};

export function MilestoneTimeline({
  milestones,
  startDate,
  endDate,
  forecastEndDate,
}: {
  milestones: Milestone[];
  startDate: string;
  endDate: string;
  forecastEndDate: string;
}) {
  const [view, setView] = useState<View>("attention");
  const [expanded, setExpanded] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of milestones) c[m.status] = (c[m.status] ?? 0) + 1;
    return c;
  }, [milestones]);

  const filtered = useMemo(() => {
    const byDate = [...milestones].sort((a, b) => a.forecastDate.localeCompare(b.forecastDate));
    if (view === "attention") return byDate.filter((m) => m.status !== "Complete");
    if (view === "risk") return byDate.filter((m) => m.status === "Late" || m.status === "At Risk");
    return byDate;
  }, [milestones, view]);

  const shown = expanded ? filtered : filtered.slice(0, CAP);
  const hidden = filtered.length - shown.length;

  return (
    <div>
      {/* Status summary */}
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_ORDER.map((s) => (
          <span
            key={s}
            className="hv-num inline-flex items-center gap-1.5 rounded-full border border-hv-border px-2.5 py-1 text-[0.7rem] text-hv-muted"
          >
            <span className="h-2 w-2 rounded-full" style={{ background: STATUS_DOT[s] }} />
            {s} <span className="font-semibold text-navy">{counts[s] ?? 0}</span>
          </span>
        ))}
      </div>

      {/* View switcher */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Milestone view">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={view === v.id}
            onClick={() => {
              setView(v.id);
              setExpanded(false);
            }}
            className={`rounded-full px-3 py-1.5 text-[0.72rem] font-medium transition ${
              view === v.id ? "bg-navy text-white" : "border border-hv-border text-navy hover:border-teal"
            }`}
          >
            {v.label}
          </button>
        ))}
        <span className="hv-num ml-auto text-[0.7rem] text-hv-subtle">
          Showing {shown.length} of {filtered.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-hv-subtle">Nothing in this view.</p>
      ) : (
        <div className={expanded ? "max-h-[560px] overflow-y-auto pr-1" : ""}>
          <MilestoneGantt
            milestones={shown}
            startDate={startDate}
            endDate={endDate}
            forecastEndDate={forecastEndDate}
          />
        </div>
      )}

      {(hidden > 0 || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 w-full rounded-full border border-hv-border py-2 text-[0.75rem] font-medium text-hv-muted transition hover:border-teal hover:text-teal-ink"
        >
          {expanded ? "Show fewer" : `Show all ${filtered.length}`}
        </button>
      )}
    </div>
  );
}
