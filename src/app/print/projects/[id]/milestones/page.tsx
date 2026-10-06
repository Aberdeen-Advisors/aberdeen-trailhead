import { notFound } from "next/navigation";
import { getProject, getMilestones } from "@/lib/data/provider";
import { MilestoneGantt } from "@/components/milestone-gantt";
import { PrintButton } from "@/components/print-button";

// Printable milestone timeline: every milestone on the Gantt (baseline to
// forecast) plus a milestone table, laid out for landscape paper. Use the
// browser's "Save as PDF" to export. Sits outside the portal layout so
// nothing else prints.

export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (d?: string | null) => {
  if (!d) return "";
  const x = new Date(d.slice(0, 10) + "T00:00:00Z");
  return Number.isNaN(x.getTime()) ? "" : `${MONTHS[x.getUTCMonth()]} ${x.getUTCDate()}, ${x.getUTCFullYear()}`;
};
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

const STATUS_ORDER = ["Late", "At Risk", "On Track", "Complete"] as const;
const STATUS_DOT: Record<string, string> = { Late: "#DB504A", "At Risk": "#F7D002", "On Track": "#5CC8FF", Complete: "#00A676" };

export default async function PrintMilestonesPage({ params }: { params: { id: string } }) {
  const [project, all] = await Promise.all([getProject(params.id), getMilestones(params.id)]);
  if (!project) notFound();
  const milestones = [...all].sort((a, b) => a.forecastDate.localeCompare(b.forecastDate));

  // Same geometry as the chart (viewBox 760 wide, 38 per row + axis), so the
  // printed chart is sized to fit on the first landscape page.
  const ratio = (38 + (milestones.length + 1) * 38 + 12) / 760;
  const chartWidthIn = Math.min(10, 5.6 / ratio);

  const today = new Date().toISOString().slice(0, 10);
  const counts: Record<string, number> = {};
  for (const m of milestones) counts[m.status] = (counts[m.status] ?? 0) + 1;

  const th = "border-b-2 border-navy px-2 py-1.5 text-left text-[0.62rem] font-semibold uppercase tracking-wider text-navy";
  const td = "border-b border-hv-border px-2 py-1.5 align-top";

  return (
    <main className="mx-auto max-w-[1400px] bg-white p-8 text-hv-text print:max-w-none print:p-0">
      <style>{`
        @page { size: letter landscape; margin: 0.45in; }
        @media print {
          body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .ms-gantt { width: ${chartWidthIn.toFixed(2)}in; margin: 0 auto; }
          .ms-gantt svg { min-width: 0 !important; }
          .ms-gantt .hv-scroll-x { overflow: visible !important; }
          tr { break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}</style>

      <header className="mb-4 flex items-end justify-between gap-6 border-b-2 border-navy pb-3">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/aberdeen-logo-blue.svg" alt="Aberdeen Advisors" className="mb-3 h-7" />
          <h1 className="text-2xl font-bold text-navy">{project.name} · Milestone Timeline</h1>
          <p className="mt-1 text-[0.8rem] text-hv-muted">
            {project.code} · PM {project.projectManager} · {milestones.length} milestone{milestones.length === 1 ? "" : "s"} · Forecast finish {fmt(project.forecastCompletionDate)} · Printed {fmt(today)}
          </p>
        </div>
        <PrintButton />
      </header>

      <div className="mb-3 flex flex-wrap gap-2">
        {STATUS_ORDER.map((s) => (
          <span key={s} className="hv-num inline-flex items-center gap-1.5 rounded-full border border-hv-border px-2.5 py-1 text-[0.7rem] text-hv-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: STATUS_DOT[s] }} />
            {s} <span className="font-semibold text-navy">{counts[s] ?? 0}</span>
          </span>
        ))}
      </div>

      {milestones.length === 0 ? (
        <p className="py-10 text-center text-sm text-hv-subtle">This project has no milestones yet.</p>
      ) : (
        <>
          <section className="ms-gantt mb-8">
            <MilestoneGantt
              milestones={milestones}
              startDate={project.startDate}
              endDate={project.endDate}
              forecastEndDate={project.forecastCompletionDate}
            />
          </section>

          <section className={milestones.length > 8 ? "break-before-page" : ""}>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-navy">Milestones</h2>
            <table className="w-full border-collapse text-[0.72rem]">
              <thead>
                <tr>
                  <th className={th}>Milestone</th>
                  <th className={th}>Baseline</th>
                  <th className={th}>Forecast</th>
                  <th className={`${th} text-right`}>Slip (days)</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((m) => {
                  const slip = m.baselineDate && m.forecastDate ? days(m.baselineDate, m.forecastDate) : 0;
                  return (
                    <tr key={m.id}>
                      <td className={`${td} font-semibold text-navy`}>{m.name}</td>
                      <td className={`${td} hv-num whitespace-nowrap`}>{fmt(m.baselineDate)}</td>
                      <td className={`${td} hv-num whitespace-nowrap`}>{fmt(m.forecastDate)}</td>
                      <td className={`${td} hv-num text-right ${slip > 0 ? "text-red-600" : ""}`}>{slip > 0 ? `+${slip}` : slip < 0 ? slip : "0"}</td>
                      <td className={`${td} whitespace-nowrap`}>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: STATUS_DOT[m.status] ?? "#97A5AE" }} />
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </>
      )}

      <footer className="mt-6 text-[0.65rem] text-hv-subtle">
        HorizonView · Bars run from baseline to forecast date; a diamond means the milestone has not moved. Data at time of printing.
      </footer>
    </main>
  );
}
