// Project Gantt: tasks as bars (start → finish, with % done) and milestones as
// diamonds, grouped by workstream. Pure SVG with no hooks, so the same chart
// renders on the project page and on the printable plan.

export interface PlanTask {
  id: string;
  title: string;
  workstream_id: string | null;
  status: string;
  owner?: string | null;
  start_date: string | null;
  target_date: string | null;
  pct_complete?: number | null;
  update_type?: string;
}
export interface PlanMilestone {
  id: string;
  name: string;
  workstream_id: string | null;
  status: string;
  owner?: string | null;
  forecast_date: string | null;
}
export interface PlanWorkstream { id: string; name: string }

const C = {
  navy: "#09375F", teal: "#44B0B1", rule: "#DDE7ED", band: "#F4F8FA", onyx: "#404040", subtle: "#7C8B96",
  done: "#00A676", progress: "#0072AD", risk: "#E0B400", bad: "#DB504A", idle: "#A9B7C2",
};
const TASK_FILL: Record<string, string> = {
  Closed: C.done, "In Progress": C.progress, "At Risk": C.risk, "Off Track": C.bad, "Not Started": C.idle,
};
const MS_FILL: Record<string, string> = { Complete: C.done, "On Track": "#5CC8FF", "At Risk": C.risk, Late: C.bad };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const t = (d: string) => Date.parse(d + "T00:00:00Z");
const fmt = (d: string) => { const x = new Date(t(d)); return `${MONTHS[x.getUTCMonth()]} ${x.getUTCDate()}, ${x.getUTCFullYear()}`; };
const trunc = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…");

type Row =
  | { kind: "group"; label: string }
  | { kind: "task"; item: PlanTask; s: number; f: number }
  | { kind: "milestone"; item: PlanMilestone; d: number };

export function GanttChart({
  tasks, milestones, workstreams, showTasks = true, showMilestones = true, today, labelChars = 34,
}: {
  tasks: PlanTask[]; milestones: PlanMilestone[]; workstreams: PlanWorkstream[];
  showTasks?: boolean; showMilestones?: boolean; today?: string; labelChars?: number;
}) {
  // Scheduled items only; a task with one date is drawn as a short bar on that date.
  const sTasks = showTasks
    ? tasks.filter((x) => x.start_date || x.target_date).map((x) => {
        const a = t((x.start_date || x.target_date)!), b = t((x.target_date || x.start_date)!);
        return { item: x, s: Math.min(a, b), f: Math.max(a, b) };
      })
    : [];
  const sMs = showMilestones ? milestones.filter((m) => m.forecast_date).map((m) => ({ item: m, d: t(m.forecast_date!) })) : [];

  if (!sTasks.length && !sMs.length) {
    return <p className="py-8 text-center text-sm text-hv-subtle">Nothing scheduled to show. Add start and finish dates to tasks, or dates to milestones.</p>;
  }

  // Group by workstream (in workstream order), then project-level items last.
  const groups: { id: string | null; label: string }[] = [...workstreams.map((w) => ({ id: w.id, label: w.name })), { id: null, label: "Project level" }];
  const rows: Row[] = [];
  for (const g of groups) {
    const gt = sTasks.filter((x) => (x.item.workstream_id ?? null) === g.id);
    const gm = sMs.filter((x) => (x.item.workstream_id ?? null) === g.id);
    if (!gt.length && !gm.length) continue;
    rows.push({ kind: "group", label: g.label });
    const items: Row[] = [
      ...gt.map((x) => ({ kind: "task" as const, ...x })),
      ...gm.map((x) => ({ kind: "milestone" as const, ...x })),
    ].sort((a, b) => (a.kind === "task" ? a.s : (a as any).d) - (b.kind === "task" ? b.s : (b as any).d));
    rows.push(...items);
  }

  // Time domain, padded to whole months.
  const all = [...sTasks.flatMap((x) => [x.s, x.f]), ...sMs.map((x) => x.d)];
  const lo = new Date(Math.min(...all)), hi = new Date(Math.max(...all));
  const t0 = Date.UTC(lo.getUTCFullYear(), lo.getUTCMonth(), 1);
  const t1 = Date.UTC(hi.getUTCFullYear(), hi.getUTCMonth() + 1, 1);

  const W = 1100, LABEL = 270, CX = LABEL + 10, CR = W - 14, AXIS = 40, ROW = 26, GROUP = 24, PAD = 10;
  const x = (v: number) => CX + ((v - t0) / (t1 - t0)) * (CR - CX);
  const rowH = (r: Row) => (r.kind === "group" ? GROUP : ROW);
  const H = AXIS + rows.reduce((s, r) => s + rowH(r), 0) + PAD;

  // Month ticks, thinned to ~14 labels; quarter lines stronger.
  const ticks: number[] = [];
  for (let d = new Date(t0); d.getTime() <= t1; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) ticks.push(d.getTime());
  const every = Math.max(1, Math.ceil(ticks.length / 14));
  const todayMs = today ? t(today) : Date.now();
  const showToday = todayMs >= t0 && todayMs <= t1;

  let y = AXIS;
  const body: JSX.Element[] = [];
  rows.forEach((r, i) => {
    const h = rowH(r), mid = y + h / 2;
    if (r.kind === "group") {
      body.push(
        <g key={`g${i}`}>
          <rect x={0} y={y + 2} width={W} height={h - 2} fill={C.band} />
          <text x={6} y={mid + 4} fontSize="11" fontWeight="700" fill={C.navy}>{r.label}</text>
        </g>
      );
    } else if (r.kind === "task") {
      const it = r.item, x0 = x(r.s), x1 = Math.max(x(r.f + 86_400_000), x0 + 3);
      const fill = TASK_FILL[it.status] ?? C.idle;
      const pct = Math.max(0, Math.min(100, Number(it.pct_complete ?? (it.status === "Closed" ? 100 : 0))));
      const overdue = it.status !== "Closed" && r.f < todayMs;
      body.push(
        <g key={`t${it.id}`}>
          <title>{`${it.title}\n${it.start_date ? fmt(it.start_date) : "?"} → ${it.target_date ? fmt(it.target_date) : "?"} · ${it.status} · ${pct}% done${it.owner ? ` · ${it.owner}` : ""}${overdue ? " · past finish date" : ""}`}</title>
          <text x={16} y={mid + 4} fontSize="11" fill={C.onyx}>{trunc(it.title, labelChars)}</text>
          <rect x={x0} y={mid - 7} width={x1 - x0} height={14} rx={3} fill={fill} opacity={0.3} />
          <rect x={x0} y={mid - 7} width={((x1 - x0) * pct) / 100} height={14} rx={3} fill={fill} />
          {overdue && <rect x={x0} y={mid - 7} width={x1 - x0} height={14} rx={3} fill="none" stroke={C.bad} strokeWidth={1.5} />}
          {x1 - x0 > 34 && pct > 0 && pct < 100 && (
            <text x={x0 + 5} y={mid + 3.5} fontSize="9" fontWeight="700" fill="#fff">{pct}%</text>
          )}
        </g>
      );
    } else {
      const it = r.item, cx = x(r.d);
      body.push(
        <g key={`m${it.id}`}>
          <title>{`Milestone: ${it.name}\n${fmt(it.forecast_date!)} · ${it.status}${it.owner ? ` · ${it.owner}` : ""}`}</title>
          <text x={16} y={mid + 4} fontSize="11" fontWeight="600" fill={C.navy}>{"◆ " + trunc(it.name, labelChars - 2)}</text>
          <rect x={cx - 6} y={mid - 6} width={12} height={12} fill={MS_FILL[it.status] ?? C.idle} stroke="#fff" strokeWidth={1.5} transform={`rotate(45 ${cx} ${mid})`} />
          <text x={cx + 11} y={mid + 3.5} fontSize="9" fill={C.subtle}>{fmt(it.forecast_date!).replace(/, \d{4}$/, "")}</text>
        </g>
      );
    }
    body.push(<line key={`l${i}`} x1={0} x2={W} y1={y + h} y2={y + h} stroke={C.rule} strokeWidth={0.6} />);
    y += h;
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Project Gantt chart of tasks and milestones" style={{ minWidth: 760 }}>
      {ticks.map((tk, i) => {
        const m = new Date(tk).getUTCMonth();
        return (
          <g key={tk}>
            <line x1={x(tk)} x2={x(tk)} y1={AXIS - 8} y2={H - PAD} stroke={C.rule} strokeWidth={m % 3 === 0 ? 1 : 0.5} />
            {i % every === 0 && i < ticks.length - 1 && (
              <text x={x(tk) + 3} y={AXIS - 14} fontSize="10" fill={C.subtle}>{`${MONTHS[m]} ${String(new Date(tk).getUTCFullYear()).slice(2)}`}</text>
            )}
          </g>
        );
      })}
      <line x1={0} x2={W} y1={AXIS - 1} y2={AXIS - 1} stroke={C.rule} />
      <text x={6} y={AXIS - 14} fontSize="10" fontWeight="700" fill={C.subtle} letterSpacing="0.08em">TASK / MILESTONE</text>
      {body}
      {showToday && (
        <g>
          <line x1={x(todayMs)} x2={x(todayMs)} y1={AXIS - 6} y2={H - PAD} stroke={C.teal} strokeWidth={1.5} strokeDasharray="3 3" />
          <text x={x(todayMs)} y={AXIS - 26} textAnchor="middle" fontSize="9" fontWeight="700" fill={C.teal}>Today</text>
        </g>
      )}
    </svg>
  );
}

export function GanttLegend() {
  const item = (color: string, label: string, diamond = false) => (
    <span className="inline-flex items-center gap-1.5">
      <span className={diamond ? "h-2.5 w-2.5 rotate-45" : "h-2.5 w-5 rounded-sm"} style={{ background: color }} />
      {label}
    </span>
  );
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.7rem] text-hv-muted">
      {item(C.done, "Done")}
      {item(C.progress, "In progress")}
      {item(C.risk, "At risk")}
      {item(C.bad, "Off track")}
      {item(C.idle, "Not started")}
      <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-5 rounded-sm border-[1.5px]" style={{ borderColor: C.bad }} />Past finish date</span>
      {item("#5CC8FF", "Milestone", true)}
      <span className="text-hv-subtle">Solid part of a bar = % done</span>
    </div>
  );
}
