import { notFound } from "next/navigation";
import { getProject } from "@/lib/data/provider";
import { sbSelect, hasSupabase } from "@/lib/supabase";
import { isDbProject } from "@/lib/registry";
import { GanttChart, GanttLegend, ganttDomain, paginateGantt, type PlanMilestone, type PlanTask, type PlanWorkstream } from "@/components/gantt-chart";
import { PrintButton } from "@/components/print-button";

// Printable project plan: the full Gantt (every task and milestone) plus a
// schedule table, laid out for landscape paper. Use the browser's
// "Save as PDF" to export. Sits outside the portal layout so nothing else prints.

export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (d?: string | null) => {
  if (!d) return "";
  const x = new Date(d + "T00:00:00Z");
  return `${MONTHS[x.getUTCMonth()]} ${x.getUTCDate()}, ${x.getUTCFullYear()}`;
};

export default async function PrintPlanPage({ params }: { params: { id: string } }) {
  if (!hasSupabase() || !(await isDbProject(params.id))) notFound();
  const q = `project_id=eq.${encodeURIComponent(params.id)}`;
  const [project, acts, ms, ws] = await Promise.all([
    getProject(params.id),
    sbSelect("activities", `${q}&order=start_date.asc.nullslast,target_date.asc.nullslast`),
    sbSelect("milestones", `${q}&order=forecast_date.asc.nullslast`),
    sbSelect("workstreams", `${q}&order=sort_order.asc,name.asc`),
  ]);
  if (!project) notFound();

  const tasks = (acts as any[]).filter((a) => !a.exclude_from_report) as PlanTask[];
  const milestones = ms as unknown as PlanMilestone[];
  const workstreams = ws as unknown as PlanWorkstream[];
  const wsName = new Map(workstreams.map((w) => [w.id, w.name]));
  const wsOrder = new Map(workstreams.map((w, i) => [w.id, i]));

  // One schedule list: tasks and milestones together, by workstream then date.
  const rows = [
    ...tasks.map((t) => ({
      kind: "Task" as const, type: t.update_type || "Task", name: t.title, ws: t.workstream_id, owner: t.owner,
      start: t.start_date, finish: t.target_date, status: t.status,
      pct: t.pct_complete ?? (t.status === "Closed" ? 100 : 0),
    })),
    ...milestones.map((m) => ({
      kind: "Milestone" as const, type: "Milestone", name: m.name, ws: m.workstream_id, owner: m.owner,
      start: m.forecast_date, finish: m.forecast_date, status: m.status, pct: null as number | null,
    })),
  ].sort((a, b) => {
    const wa = a.ws ? wsOrder.get(a.ws) ?? 99 : 100, wb = b.ws ? wsOrder.get(b.ws) ?? 99 : 100;
    if (wa !== wb) return wa - wb;
    return (a.start || a.finish || "9999").localeCompare(b.start || b.finish || "9999");
  });

  const today = new Date().toISOString().slice(0, 10);
  const domain = ganttDomain(tasks, milestones);
  const th = "border-b-2 border-navy px-2 py-1.5 text-left text-[0.62rem] font-semibold uppercase tracking-wider text-navy";
  const td = "border-b border-hv-border px-2 py-1.5 align-top";

  return (
    <main className="mx-auto max-w-[1400px] bg-white p-8 text-hv-text print:max-w-none print:p-0">
      <style>{`
        @page { size: letter landscape; margin: 0.45in; }
        @media print {
          body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .plan-gantt svg { min-width: 0 !important; }
          tr { break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}</style>

      <header className="mb-5 flex items-end justify-between gap-6 border-b-2 border-navy pb-3">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/aberdeen-logo-blue.svg" alt="Aberdeen Advisors" className="mb-3 h-7" />
          <h1 className="text-2xl font-bold text-navy">{project.name} · Project Plan</h1>
          <p className="mt-1 text-[0.8rem] text-hv-muted">
            {project.code} · PM {project.projectManager} · {tasks.length} tasks and activities · {milestones.length} milestones · Printed {fmt(today)}
          </p>
        </div>
        <PrintButton />
      </header>

      {/* The chart is split into page-sized pieces that share one time axis,
          so the browser never pushes a too-tall chart onto the next page. */}
      {paginateGantt(tasks, milestones, workstreams).map((pg, i) => (
        <section key={i} className={`plan-gantt mb-3 ${i > 0 ? "break-before-page" : ""}`}>
          <GanttChart tasks={pg.tasks} milestones={pg.milestones} workstreams={workstreams} today={today} labelChars={40} domain={domain} />
        </section>
      ))}
      <div className="mb-8"><GanttLegend /></div>

      <section className="break-before-page">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-navy">Schedule</h2>
        <table className="w-full border-collapse text-[0.72rem]">
          <thead>
            <tr>
              <th className={th}>Type</th>
              <th className={th}>Task / milestone</th>
              <th className={th}>Workstream</th>
              <th className={th}>Owner</th>
              <th className={th}>Start</th>
              <th className={th}>Finish</th>
              <th className={th}>Status</th>
              <th className={`${th} text-right`}>% done</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={r.kind === "Milestone" ? "bg-navy-tint/50" : undefined}>
                <td className={`${td} whitespace-nowrap`}>{r.kind === "Milestone" ? "◆ Milestone" : r.type}</td>
                <td className={`${td} ${r.kind === "Milestone" ? "font-semibold text-navy" : ""}`}>{r.name}</td>
                <td className={td}>{r.ws ? wsName.get(r.ws) ?? "" : "Project level"}</td>
                <td className={td}>{r.owner ?? ""}</td>
                <td className={`${td} hv-num whitespace-nowrap`}>{r.kind === "Milestone" ? "" : fmt(r.start)}</td>
                <td className={`${td} hv-num whitespace-nowrap`}>{fmt(r.finish)}</td>
                <td className={`${td} whitespace-nowrap`}>{r.status}</td>
                <td className={`${td} hv-num text-right`}>{r.pct == null ? "" : `${r.pct}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="mt-6 text-[0.65rem] text-hv-subtle">
        HorizonView · Data from the project&apos;s HorizonView tables at time of printing.
      </footer>
    </main>
  );
}
