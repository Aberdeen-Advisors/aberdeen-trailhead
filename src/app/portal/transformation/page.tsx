import { HealthBadge, KpiCard, Notice, PageHeader, Panel, ScoreBar, SegmentBar } from "@/components/ui";
import type { HealthStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

// ---------- Program tracking ----------

type Phase = { key: string; label: string; window: string; state: "done" | "current" | "upcoming" };
const phases: Phase[] = [
  { key: "discovery", label: "Discovery", window: "Q3 2023", state: "done" },
  { key: "build", label: "Build", window: "Q4 2023 to Q3 2025", state: "done" },
  { key: "test", label: "Test", window: "Q4 2025 to Q1 2026", state: "current" },
  { key: "deploy", label: "Deploy", window: "Q2 2026", state: "upcoming" },
  { key: "hypercare", label: "Hypercare", window: "Q2 to Q3 2026", state: "upcoming" },
];

type Workstream = { name: string; lead: string; health: HealthStatus; progressPct: number; detail: string };
const workstreams: Workstream[] = [
  { name: "Strategy and Architecture", lead: "K. Iyer", health: "Green", progressPct: 92, detail: "Target state signed off, clean-core stance ratified." },
  { name: "Data and Integration", lead: "R. Alvarez", health: "Amber", progressPct: 68, detail: "Integration platform 74% complete, replication window under review." },
  { name: "ERP Core", lead: "P. Mehra", health: "Green", progressPct: 71, detail: "Config baseline frozen for wave 1 entities." },
  { name: "Decommissioning and Cleanup", lead: "S. Okafor", health: "Amber", progressPct: 54, detail: "Custom code footprint reduced 61%, satellite retirements underway." },
  { name: "Adoption and Change", lead: "M. Vance", health: "Green", progressPct: 63, detail: "Train-the-trainer sessions started, super-user network live." },
  { name: "Testing and Cutover", lead: "L. Chen", health: "Red", progressPct: 44, detail: "Mock cutover 3 defect burn-down slower than plan." },
];

type Raid = { id: string; type: "Risk" | "Issue" | "Decision"; title: string; owner: string; due: string; severity: "High" | "Medium" | "Low" };
const raid: Raid[] = [
  { id: "RSK-241", type: "Risk", title: "Replication latency to lakehouse could miss cutover window", owner: "R. Alvarez", due: "2026-04-30", severity: "High" },
  { id: "ISS-118", type: "Issue", title: "Integration throughput ceiling on payroll archive extract", owner: "R. Alvarez", due: "2026-04-15", severity: "Medium" },
  { id: "DEC-052", type: "Decision", title: "Approve extension to Mock Cutover 3 window", owner: "P. Mehra", due: "2026-04-12", severity: "High" },
  { id: "RSK-238", type: "Risk", title: "Legal review of retention rules for archived HR data", owner: "S. Okafor", due: "2026-05-01", severity: "Medium" },
];

type Deliverable = { name: string; owner: string; due: string; status: "Complete" | "In Progress" | "At Risk" | "Not Started" };
const deliverables: Deliverable[] = [
  { name: "Target Architecture v3.2", owner: "K. Iyer", due: "2026-03-31", status: "Complete" },
  { name: "Cutover Runbook (Wave 1)", owner: "L. Chen", due: "2026-04-18", status: "In Progress" },
  { name: "Data Migration Reconciliation Pack", owner: "R. Alvarez", due: "2026-04-22", status: "At Risk" },
  { name: "Business Readiness Scorecard", owner: "M. Vance", due: "2026-04-25", status: "In Progress" },
  { name: "Hypercare Ops Model", owner: "K. Iyer", due: "2026-05-10", status: "Not Started" },
  { name: "Role Cleanup Attestation", owner: "S. Okafor", due: "2026-04-30", status: "In Progress" },
];

const deliverableTone: Record<Deliverable["status"], string> = {
  Complete: "text-emerald-300",
  "In Progress": "text-sky-300",
  "At Risk": "text-amber-300",
  "Not Started": "text-hv-subtle",
};

const raidBadgeTone: Record<Raid["type"], string> = {
  Risk: "border-red-500/35 bg-red-50 text-red-300",
  Issue: "border-amber-500/50 bg-amber-50 text-amber-300",
  Decision: "border-sky-400/35 bg-sky-50 text-sky-300",
};

// ---------- OCM ----------

// Adoption trend: percent of licensed users active weekly, split by role band.
type TrendPoint = { week: string; exec: number; pm: number; ic: number };
const trend: TrendPoint[] = [
  { week: "W-8", exec: 22, pm: 41, ic: 18 },
  { week: "W-7", exec: 29, pm: 48, ic: 24 },
  { week: "W-6", exec: 34, pm: 55, ic: 31 },
  { week: "W-5", exec: 42, pm: 58, ic: 36 },
  { week: "W-4", exec: 47, pm: 62, ic: 40 },
  { week: "W-3", exec: 55, pm: 68, ic: 47 },
  { week: "W-2", exec: 61, pm: 71, ic: 53 },
  { week: "W-1", exec: 68, pm: 76, ic: 59 },
  { week: "This wk", exec: 74, pm: 82, ic: 64 },
];

const processes = ["Order to Cash", "Procure to Pay", "Record to Report", "Hire to Retire", "Plan to Deliver"];
const roles = ["Executives", "Process Owners", "Super Users", "End Users", "IT Support"];
const impact: number[][] = [
  [1, 3, 3, 3, 2],
  [1, 3, 2, 3, 2],
  [2, 3, 3, 2, 1],
  [1, 2, 3, 3, 2],
  [1, 3, 2, 2, 1],
];
const impactLabel = ["Low", "Medium", "High", "Severe"];
const impactBg = [
  "bg-emerald-50 text-emerald-300 border-emerald-500/30",
  "bg-sky-50 text-sky-300 border-sky-400/30",
  "bg-amber-50 text-amber-300 border-amber-500/45",
  "bg-red-50 text-red-300 border-red-500/35",
];

type Stakeholder = { name: string; role: string; influence: "High" | "Medium" | "Low"; stance: "Champion" | "Supportive" | "Neutral" | "Skeptical"; raci: string };
const stakeholders: Stakeholder[] = [
  { name: "Deepa Warren", role: "CFO", influence: "High", stance: "Supportive", raci: "A" },
  { name: "Nathan Ito", role: "CIO", influence: "High", stance: "Champion", raci: "R" },
  { name: "Priya Kaur", role: "VP Supply Chain", influence: "High", stance: "Neutral", raci: "C" },
  { name: "Jose Mendez", role: "Controller", influence: "Medium", stance: "Skeptical", raci: "C" },
  { name: "Alex Kim", role: "Head of HRIS", influence: "Medium", stance: "Supportive", raci: "R" },
  { name: "Sara Bloom", role: "Head of Data", influence: "Medium", stance: "Champion", raci: "R" },
];

const stanceTone: Record<Stakeholder["stance"], string> = {
  Champion: "bg-emerald-50 text-emerald-300 border-emerald-500/30",
  Supportive: "bg-sky-50 text-sky-300 border-sky-400/30",
  Neutral: "bg-hv-bg text-hv-muted border-hv-border",
  Skeptical: "bg-amber-50 text-amber-300 border-amber-500/45",
};
const influenceTone: Record<Stakeholder["influence"], string> = {
  High: "text-red-300",
  Medium: "text-amber-300",
  Low: "text-hv-subtle",
};

type Training = { audience: string; enrolled: number; completed: number; overdue: number };
const trainings: Training[] = [
  { audience: "Executives", enrolled: 24, completed: 18, overdue: 2 },
  { audience: "Process Owners", enrolled: 62, completed: 47, overdue: 5 },
  { audience: "Super Users", enrolled: 148, completed: 121, overdue: 12 },
  { audience: "End Users (Finance)", enrolled: 412, completed: 289, overdue: 41 },
  { audience: "End Users (SC)", enrolled: 386, completed: 244, overdue: 63 },
];

type LeaderView = { name: string; role: string; lastView: string; topDashboard: string; viewsThisMonth: number };
const leaders: LeaderView[] = [
  { name: "N. Ito", role: "CIO", lastView: "2h ago", topDashboard: "Program Home", viewsThisMonth: 34 },
  { name: "D. Warren", role: "CFO", lastView: "yesterday", topDashboard: "Cutover Readiness", viewsThisMonth: 28 },
  { name: "P. Kaur", role: "VP SC", lastView: "4d ago", topDashboard: "Workstream Health", viewsThisMonth: 9 },
  { name: "S. Bloom", role: "Head of Data", lastView: "1h ago", topDashboard: "Integration Status", viewsThisMonth: 52 },
  { name: "J. Mendez", role: "Controller", lastView: "6d ago", topDashboard: "Financial Readiness", viewsThisMonth: 4 },
];

// Brand chart colors, taken from the Aberdeen secondary palette on the site.
const SERIES = [
  { key: "exec", label: "Executives", color: "#09375F" },
  { key: "pm", label: "Process / PM", color: "#00A676" },
  { key: "ic", label: "End Users", color: "#0072AD" },
] as const;

function TrendChart({ points }: { points: TrendPoint[] }) {
  const w = 640;
  const h = 210;
  const padX = 34;
  const padY = 18;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2 - 14;
  const xStep = innerW / (points.length - 1);
  const yFor = (v: number) => padY + innerH - (v / 100) * innerH;
  const pathFor = (key: "exec" | "pm" | "ic") =>
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${padX + i * xStep} ${yFor(p[key])}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Weekly active users by role band">
      <g stroke="#DDE7ED" strokeWidth="1">
        {[0, 25, 50, 75, 100].map((v) => (
          <line key={v} x1={padX} x2={padX + innerW} y1={yFor(v)} y2={yFor(v)} />
        ))}
      </g>
      <g fontSize="10" fill="#8296A6" fontFamily="Segoe UI, sans-serif">
        {[0, 25, 50, 75, 100].map((v) => (
          <text key={v} x={padX - 8} y={yFor(v) + 3} textAnchor="end">
            {v}%
          </text>
        ))}
        {points.map((p, i) => (
          <text key={p.week} x={padX + i * xStep} y={h - 4} textAnchor="middle">
            {p.week}
          </text>
        ))}
      </g>
      {SERIES.map((s) => (
        <g key={s.key}>
          <path d={pathFor(s.key)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={padX + (points.length - 1) * xStep} cy={yFor(points[points.length - 1][s.key])} r="3.5" fill={s.color} />
        </g>
      ))}
    </svg>
  );
}

export default function EnterpriseTransformationPortal() {
  const green = workstreams.filter((w) => w.health === "Green").length;
  const amber = workstreams.filter((w) => w.health === "Amber").length;
  const red = workstreams.filter((w) => w.health === "Red").length;
  const openHighRaid = raid.filter((r) => r.severity === "High").length;
  const avgProgress = Math.round(workstreams.reduce((a, w) => a + w.progressPct, 0) / workstreams.length);

  const totalEnrolled = trainings.reduce((a, t) => a + t.enrolled, 0);
  const totalCompleted = trainings.reduce((a, t) => a + t.completed, 0);
  const totalOverdue = trainings.reduce((a, t) => a + t.overdue, 0);
  const completionPct = Math.round((totalCompleted / totalEnrolled) * 100);
  const currentAdoption = trend[trend.length - 1];
  const avgWeekly = Math.round((currentAdoption.exec + currentAdoption.pm + currentAdoption.ic) / 3);

  return (
    <div className="space-y-10">
      <Notice>
        <strong className="font-semibold">Example page</strong> — this control tower is configured for an{" "}
        <strong className="font-semibold">ERP transformation program</strong>; the phase gates, workstreams,
        cutover readiness, and adoption metrics below are illustrative of an ERP implementation. HorizonView
        configures the same structure for any transformation type.
      </Notice>

      <PageHeader
        kicker="Example · ERP Transformation"
        title="Enterprise Transformation Program"
        sub="One control tower for the active program — phase gates, workstream health, cutover readiness, RAID, and adoption."
      />

      {/* ── Phase gate band ─────────────────────────────────────────────────*/}
      <section className="overflow-hidden rounded-hv bg-hv-hero shadow-hv">
        <div className="p-6 lg:p-7">
          <div className="hv-kicker-light mb-4">Phase Gates</div>
          <div className="hv-scroll-x">
            <ol className="flex min-w-max items-stretch gap-2">
              {phases.map((p, i) => {
                const active = p.state === "current";
                const done = p.state === "done";
                return (
                  <li key={p.key} className="flex items-center gap-2">
                    {i > 0 && (
                      <span
                        className={`block h-[2px] w-6 rounded-full ${
                          done ? "bg-teal" : active ? "bg-gradient-to-r from-teal to-white/25" : "bg-white/20"
                        }`}
                      />
                    )}
                    <div
                      className={`min-w-[9.5rem] rounded-xl border p-3.5 ${
                        active
                          ? "border-teal-bright bg-teal-bright/20"
                          : done
                            ? "border-white/20 bg-white/[0.07]"
                            : "border-white/10 bg-white/[0.03]"
                      }`}
                    >
                      <div className="hv-num text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-white/50">
                        {p.window}
                      </div>
                      <div className="mt-1 text-sm font-bold text-white">{p.label}</div>
                      <div className={`mt-1 text-[0.7rem] ${active ? "text-teal-tint" : "text-white/50"}`}>
                        {done ? "✓ Complete" : active ? "● In progress" : "Upcoming"}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      {/* ── Program KPIs ────────────────────────────────────────────────────*/}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard lane="delivery" label="Workstream Health" value={`${green}G · ${amber}A · ${red}R`}>
          <SegmentBar green={green} amber={amber} red={red} />
        </KpiCard>
        <KpiCard lane="delivery" label="Program Progress" value={`${avgProgress}%`} sub="weighted across workstreams">
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-hv-border">
            <div className="h-full rounded-full bg-navy" style={{ width: `${avgProgress}%` }} />
          </div>
        </KpiCard>
        <KpiCard
          lane="intel"
          label="Open High-Sev RAID"
          value={String(openHighRaid)}
          sub={`${raid.length} total open items`}
          tone={openHighRaid > 1 ? "warn" : "default"}
        />
        <KpiCard lane="adoption" label="Cutover Confidence" value="68%" sub="business readiness index" tone="warn" />
      </div>

      {/* ── Workstreams ─────────────────────────────────────────────────────*/}
      <Panel
        title="Workstreams"
        action={<span className="hv-num text-[0.72rem] text-hv-muted">{workstreams.length} active</span>}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workstreams.map((w) => (
            <div
              key={w.name}
              className="rounded-hv border border-hv-border p-4 transition duration-200 hover:-translate-y-0.5 hover:border-teal hover:shadow-hv"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-semibold text-navy">{w.name}</div>
                <HealthBadge status={w.health} />
              </div>
              <div className="hv-num mt-1.5 text-xs text-hv-muted">Lead: {w.lead}</div>
              <div className="mt-3">
                <ScoreBar label="Progress" score={w.progressPct} />
              </div>
              <p className="mt-3 border-t border-hv-border pt-3 text-xs font-light leading-relaxed text-hv-muted">
                {w.detail}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      {/* Cutover + RAID */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Cutover Readiness">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Mock Cutover", value: "MC3", sub: "dress rehearsal next", tone: "text-navy" },
              { label: "Open Defects", value: "82", sub: "18 high severity", tone: "text-amber-400" },
              { label: "Ready Entities", value: "9 / 14", sub: "wave 1 legal entities", tone: "text-navy" },
            ].map((s) => (
              <div key={s.label} className="rounded-hv border border-hv-border bg-hv-bg p-3.5">
                <div className="truncate text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-hv-subtle">
                  {s.label}
                </div>
                <div className={`hv-num mt-1 text-xl font-bold ${s.tone}`}>{s.value}</div>
                <div className="hv-num mt-1 text-[0.68rem] text-hv-muted">{s.sub}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-3.5">
            <ScoreBar label="Business readiness" score={68} />
            <ScoreBar label="Data reconciliation" score={74} />
            <ScoreBar label="Integration regression" score={81} />
            <ScoreBar label="Defect burn-down (inverted)" score={54} invert />
          </div>
          <p className="mt-5 border-t border-hv-border pt-3 text-[0.7rem] font-light text-hv-subtle">
            Values illustrative. Live figures flow from the Cutover Status semantic model.
          </p>
        </Panel>

        <Panel title="Top RAID Items" action={<span className="hv-num text-[0.72rem] text-hv-muted">{raid.length} open</span>}>
          <ul className="divide-y divide-hv-border">
            {raid.map((r) => (
              <li key={r.id} className="py-3.5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.08em] ${raidBadgeTone[r.type]}`}
                  >
                    {r.type}
                  </span>
                  <span className="hv-num text-xs font-semibold text-hv-subtle">{r.id}</span>
                  <span className="hv-num ml-auto text-xs text-hv-muted">
                    {r.severity} sev · due {r.due}
                  </span>
                </div>
                <div className="mt-1.5 text-sm text-hv-text">{r.title}</div>
                <div className="hv-num mt-0.5 text-xs text-hv-muted">Owner: {r.owner}</div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* ---------- OCM section ---------- */}
      <div className="border-t border-hv-border pt-8">
        <div className="hv-kicker mb-2">Organizational Change Management</div>
        <h2 className="text-xl font-bold tracking-tight text-navy">Adoption and Change</h2>
        <p className="mt-2 max-w-3xl text-sm font-light leading-relaxed text-hv-muted">
          Change impact, stakeholder posture, adoption, training, and leadership engagement for this
          program.
        </p>
      </div>

      {/* OCM KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard lane="adoption" label="Weekly Active Users" value={`${avgWeekly}%`} sub="avg across role bands" tone={avgWeekly >= 65 ? "good" : "warn"} />
        <KpiCard lane="adoption" label="Training Completion" value={`${completionPct}%`} sub={`${totalCompleted} of ${totalEnrolled}`} tone={completionPct >= 70 ? "good" : "warn"} />
        <KpiCard lane="adoption" label="Training Overdue" value={String(totalOverdue)} sub="past due date" tone={totalOverdue > 50 ? "bad" : totalOverdue > 20 ? "warn" : "default"} />
        <KpiCard lane="adoption" label="Skeptical Stakeholders" value={String(stakeholders.filter((s) => s.stance === "Skeptical").length)} sub={`of ${stakeholders.length} tracked`} tone="warn" />
      </div>

      {/* Adoption trend */}
      <Panel title="Adoption Trend (Weekly Active Users)">
        <TrendChart points={trend} />
        <div className="mt-4 flex flex-wrap gap-5 border-t border-hv-border pt-3 text-xs font-medium text-hv-muted">
          {SERIES.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-2">
              <span className="h-1 w-5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </Panel>

      {/* Change impact heatmap */}
      <Panel title="Change Impact Heatmap">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-hv-border text-left text-[0.65rem] uppercase tracking-[0.1em] text-hv-subtle">
                <th className="pb-2.5 font-semibold">Process</th>
                {roles.map((r) => (
                  <th key={r} className="pb-2.5 font-semibold">{r}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hv-border">
              {processes.map((proc, i) => (
                <tr key={proc}>
                  <td className="py-2.5 text-hv-text">{proc}</td>
                  {impact[i].map((v, j) => (
                    <td key={j} className="py-2.5">
                      <span className={`inline-flex min-w-[64px] justify-center rounded border px-2 py-0.5 text-xs font-medium ${impactBg[v]}`}>{impactLabel[v]}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-hv-muted">Assessed jointly with process owners during discovery. Refreshed each phase gate.</p>
      </Panel>

      {/* Stakeholder RACI */}
      <Panel title="Stakeholder Analysis">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hv-border text-left text-[0.65rem] uppercase tracking-[0.1em] text-hv-subtle">
                <th className="pb-2.5 font-semibold">Stakeholder</th>
                <th className="pb-2.5 font-semibold">Role</th>
                <th className="pb-2.5 font-semibold">Influence</th>
                <th className="pb-2.5 font-semibold">Stance</th>
                <th className="pb-2.5 font-semibold">RACI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hv-border">
              {stakeholders.map((s) => (
                <tr key={s.name}>
                  <td className="py-2.5 text-hv-text">{s.name}</td>
                  <td className="py-2.5 text-hv-muted">{s.role}</td>
                  <td className={`py-2.5 text-xs font-semibold ${influenceTone[s.influence]}`}>{s.influence}</td>
                  <td className="py-2.5"><span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${stanceTone[s.stance]}`}>{s.stance}</span></td>
                  <td className="py-2.5 text-sm font-semibold text-hv-text">{s.raci}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Training + Leadership */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Training Records">
          <div className="space-y-4">
            {trainings.map((t) => {
              const pct = Math.round((t.completed / t.enrolled) * 100);
              return (
                <div key={t.audience}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-hv-text">{t.audience}</span>
                    <span className="text-xs text-hv-muted">{t.completed} / {t.enrolled}, {t.overdue} overdue</span>
                  </div>
                  <ScoreBar label="Completion" score={pct} />
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Leadership Viewership">
          <ul className="divide-y divide-hv-border">
            {leaders.map((l) => (
              <li key={l.name} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <div className="text-sm text-hv-text">{l.name} <span className="text-xs text-hv-muted">, {l.role}</span></div>
                  <div className="mt-0.5 text-xs text-hv-muted">Most viewed: {l.topDashboard}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-hv-text">{l.viewsThisMonth}</div>
                  <div className="text-xs text-hv-muted">views this month, last {l.lastView}</div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Deliverables table */}
      <Panel title="Deliverables Tracker">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hv-border text-left text-[0.65rem] uppercase tracking-[0.1em] text-hv-subtle">
                <th className="pb-2.5 font-semibold">Deliverable</th>
                <th className="pb-2.5 font-semibold">Owner</th>
                <th className="pb-2.5 font-semibold">Due</th>
                <th className="pb-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hv-border">
              {deliverables.map((d) => (
                <tr key={d.name}>
                  <td className="py-2.5 text-hv-text">{d.name}</td>
                  <td className="py-2.5 text-hv-muted">{d.owner}</td>
                  <td className="py-2.5 text-hv-muted">{d.due}</td>
                  <td className={`py-2.5 text-xs font-medium ${deliverableTone[d.status]}`}>{d.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
