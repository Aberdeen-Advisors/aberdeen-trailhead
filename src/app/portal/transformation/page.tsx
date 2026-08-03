import { HealthBadge, KpiCard, Panel, ScoreBar } from "@/components/ui";
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
  Complete: "text-emerald-400",
  "In Progress": "text-sky-400",
  "At Risk": "text-amber-400",
  "Not Started": "text-hv-muted",
};

const raidBadgeTone: Record<Raid["type"], string> = {
  Risk: "border-red-500/30 bg-red-500/10 text-red-400",
  Issue: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  Decision: "border-sky-400/30 bg-sky-400/10 text-sky-400",
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
  "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  "bg-sky-400/10 text-sky-400 border-sky-400/30",
  "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "bg-red-500/20 text-red-400 border-red-500/30",
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
  Champion: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Supportive: "bg-sky-400/15 text-sky-400 border-sky-400/30",
  Neutral: "bg-hv-border text-hv-muted border-hv-border",
  Skeptical: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};
const influenceTone: Record<Stakeholder["influence"], string> = {
  High: "text-red-400",
  Medium: "text-amber-400",
  Low: "text-hv-muted",
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

function TrendChart({ points }: { points: TrendPoint[] }) {
  const w = 640;
  const h = 200;
  const padX = 32;
  const padY = 20;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const xStep = innerW / (points.length - 1);
  const yFor = (v: number) => padY + innerH - (v / 100) * innerH;
  const pathFor = (key: "exec" | "pm" | "ic") =>
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${padX + i * xStep} ${yFor(p[key])}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Weekly active users by role band">
      <g stroke="currentColor" className="text-hv-border" strokeWidth="1" opacity="0.4">
        {[0, 25, 50, 75, 100].map((v) => (
          <line key={v} x1={padX} x2={padX + innerW} y1={yFor(v)} y2={yFor(v)} />
        ))}
      </g>
      <g className="text-hv-muted" fontSize="10" fill="currentColor">
        {[0, 25, 50, 75, 100].map((v) => (
          <text key={v} x={padX - 6} y={yFor(v) + 3} textAnchor="end">{v}%</text>
        ))}
        {points.map((p, i) => (
          <text key={p.week} x={padX + i * xStep} y={h - 4} textAnchor="middle">{p.week}</text>
        ))}
      </g>
      <path d={pathFor("ic")} fill="none" stroke="#60a5fa" strokeWidth="2" />
      <path d={pathFor("pm")} fill="none" stroke="#34d399" strokeWidth="2" />
      <path d={pathFor("exec")} fill="none" stroke="#fbbf24" strokeWidth="2" />
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Enterprise Transformation Program</h1>
        <p className="mt-1 text-sm text-hv-muted">
          Phase gates, workstream health, cutover readiness, RAID, and adoption for the active program.
        </p>
      </div>

      {/* Program KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Workstream Health" value={`${green}G / ${amber}A / ${red}R`} sub={`${workstreams.length} active workstreams`} tone={red > 0 ? "bad" : amber > 0 ? "warn" : "good"} />
        <KpiCard label="Program Progress" value={`${avgProgress}%`} sub="weighted across workstreams" />
        <KpiCard label="Open High-Sev RAID" value={String(openHighRaid)} sub={`${raid.length} total open items`} tone={openHighRaid > 1 ? "warn" : "default"} />
        <KpiCard label="Cutover Confidence" value="68%" sub="business readiness index" tone="warn" />
      </div>

      {/* Phase timeline */}
      <Panel title="Phase Gates">
        <ol className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {phases.map((p) => {
            const active = p.state === "current";
            const done = p.state === "done";
            return (
              <li key={p.key} className={`rounded-lg border p-3 ${active ? "border-hv-accent bg-hv-accent/5" : done ? "border-hv-border bg-hv-panel" : "border-hv-border bg-hv-panel opacity-70"}`}>
                <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-hv-muted">{p.window}</div>
                <div className="mt-1 text-sm font-semibold text-hv-text">{p.label}</div>
                <div className="mt-1 text-xs text-hv-muted">{done ? "Complete" : active ? "In progress" : "Upcoming"}</div>
              </li>
            );
          })}
        </ol>
      </Panel>

      {/* Workstreams */}
      <Panel title="Workstreams">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workstreams.map((w) => (
            <div key={w.name} className="rounded-lg border border-hv-border p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-hv-text">{w.name}</div>
                <HealthBadge status={w.health} />
              </div>
              <div className="mt-2 text-xs text-hv-muted">Lead: {w.lead}</div>
              <div className="mt-3">
                <ScoreBar label="Progress" score={w.progressPct} />
              </div>
              <p className="mt-3 text-xs text-hv-muted">{w.detail}</p>
            </div>
          ))}
        </div>
      </Panel>

      {/* Cutover + RAID */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Cutover Readiness">
          <div className="grid grid-cols-3 gap-3">
            <KpiCard label="Mock Cutover" value="MC3" sub="dress rehearsal next" />
            <KpiCard label="Open Defects" value="82" sub="18 high severity" tone="warn" />
            <KpiCard label="Ready Entities" value="9 / 14" sub="wave 1 legal entities" />
          </div>
          <div className="mt-4 space-y-3">
            <ScoreBar label="Business Readiness" score={68} />
            <ScoreBar label="Data Reconciliation" score={74} />
            <ScoreBar label="Integration Regression" score={81} />
            <ScoreBar label="Defect Burn-Down (inverted)" score={54} invert />
          </div>
          <p className="mt-4 text-xs text-hv-muted">Values illustrative. Live figures flow from the Cutover Status semantic model.</p>
        </Panel>

        <Panel title="Top RAID Items">
          <ul className="divide-y divide-hv-border">
            {raid.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${raidBadgeTone[r.type]}`}>{r.type}</span>
                  <span className="text-xs text-hv-muted">{r.id}</span>
                  <span className="ml-auto text-xs text-hv-muted">{r.severity} sev, due {r.due}</span>
                </div>
                <div className="mt-1 text-sm text-hv-text">{r.title}</div>
                <div className="mt-0.5 text-xs text-hv-muted">Owner: {r.owner}</div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* ---------- OCM section ---------- */}
      <div className="pt-4">
        <h2 className="text-lg font-semibold tracking-tight text-hv-text">Adoption and Change</h2>
        <p className="mt-1 text-sm text-hv-muted">
          Change impact, stakeholder posture, adoption, training, and leadership engagement for this program.
        </p>
      </div>

      {/* OCM KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Weekly Active Users" value={`${avgWeekly}%`} sub="avg across role bands" tone={avgWeekly >= 65 ? "good" : "warn"} />
        <KpiCard label="Training Completion" value={`${completionPct}%`} sub={`${totalCompleted} of ${totalEnrolled}`} tone={completionPct >= 70 ? "good" : "warn"} />
        <KpiCard label="Training Overdue" value={String(totalOverdue)} sub="past due date" tone={totalOverdue > 50 ? "bad" : totalOverdue > 20 ? "warn" : "default"} />
        <KpiCard label="Skeptical Stakeholders" value={String(stakeholders.filter((s) => s.stance === "Skeptical").length)} sub={`of ${stakeholders.length} tracked`} tone="warn" />
      </div>

      {/* Adoption trend */}
      <Panel title="Adoption Trend (Weekly Active Users)">
        <TrendChart points={trend} />
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-hv-muted">
          <span className="inline-flex items-center gap-2"><span className="h-2 w-4 rounded-sm" style={{ background: "#fbbf24" }} /> Executives</span>
          <span className="inline-flex items-center gap-2"><span className="h-2 w-4 rounded-sm" style={{ background: "#34d399" }} /> Process / PM</span>
          <span className="inline-flex items-center gap-2"><span className="h-2 w-4 rounded-sm" style={{ background: "#60a5fa" }} /> End Users</span>
        </div>
      </Panel>

      {/* Change impact heatmap */}
      <Panel title="Change Impact Heatmap">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-hv-muted">
                <th className="pb-3 font-medium">Process</th>
                {roles.map((r) => (
                  <th key={r} className="pb-3 font-medium">{r}</th>
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
              <tr className="text-left text-xs uppercase tracking-wider text-hv-muted">
                <th className="pb-3 font-medium">Stakeholder</th>
                <th className="pb-3 font-medium">Role</th>
                <th className="pb-3 font-medium">Influence</th>
                <th className="pb-3 font-medium">Stance</th>
                <th className="pb-3 font-medium">RACI</th>
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
              <tr className="text-left text-xs uppercase tracking-wider text-hv-muted">
                <th className="pb-3 font-medium">Deliverable</th>
                <th className="pb-3 font-medium">Owner</th>
                <th className="pb-3 font-medium">Due</th>
                <th className="pb-3 font-medium">Status</th>
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
