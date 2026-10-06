import type { Milestone, Project, RaidItem } from "@/lib/types";

// Internal HorizonView dashboards for the sample projects. Every project shows
// the same live data (project record, milestones, RAID log), each drawn in a
// different visual style so customers can see the range of looks a HorizonView
// dashboard can take: their brand colours, a dark operations view, an
// editorial board pack, and so on. Charts are inline SVG rendered on the server.

export interface DashData {
  project: Project;
  milestones: Milestone[];
  raid: RaidItem[];
}

export interface DashStyle {
  key: string;
  name: string;
  blurb: string;
}

export const DASH_STYLES: Record<string, DashStyle> = {
  phoenix: { key: "boardroom", name: "Boardroom", blurb: "Classic executive navy and gold, built for steering committees" },
  atlas: { key: "mission", name: "Mission Control", blurb: "Dark operations view with glowing progress rings" },
  sentinel: { key: "secops", name: "Security Console", blurb: "Dense status grid with signal lights, for operations teams" },
  compass: { key: "editorial", name: "Editorial", blurb: "Warm board-pack style that leads with the narrative" },
  beacon: { key: "saas", name: "Modern SaaS", blurb: "Bright gradients, rounded cards and donut charts" },
};

export const styleFor = (projectId: string): DashStyle =>
  DASH_STYLES[projectId] ?? { key: "boardroom", name: "Boardroom", blurb: DASH_STYLES.phoenix.blurb };

// ── Shared helpers ───────────────────────────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ms = (d: string) => Date.parse(d.slice(0, 10) + "T00:00:00Z");
const fmtDate = (d: string, year = true) => {
  const x = new Date(ms(d));
  return `${MONTHS[x.getUTCMonth()]} ${x.getUTCDate()}${year ? `, ${x.getUTCFullYear()}` : ""}`;
};
const money = (n: number) =>
  Math.abs(n) >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : Math.abs(n) >= 1000 ? `$${Math.round(n / 1000)}K` : `$${Math.round(n)}`;
const slipDays = (m: Milestone) => Math.round((ms(m.forecastDate) - ms(m.baselineDate)) / 86_400_000);
const clamp = (n: number) => Math.max(0, Math.min(100, n));

function derive(d: DashData) {
  const p = d.project;
  const variance = p.forecastAtCompletion - p.budget;
  const spentPct = p.budget > 0 ? Math.round((p.actualsToDate / p.budget) * 100) : 0;
  const finishSlip = Math.round((ms(p.forecastCompletionDate) - ms(p.endDate)) / 86_400_000);
  const open = d.raid.filter((r) => r.status !== "Closed");
  const byType = (["Risk", "Issue", "Decision", "Dependency", "Assumption"] as const)
    .map((t) => ({ type: t, n: open.filter((r) => r.type === t).length }))
    .filter((x) => x.n > 0);
  const bySev = (["High", "Medium", "Low"] as const).map((s) => ({ sev: s, n: open.filter((r) => r.severity === s).length }));
  const msSorted = [...d.milestones].sort((a, b) => a.forecastDate.localeCompare(b.forecastDate));
  const next = msSorted.find((m) => m.status !== "Complete");
  return { p, variance, spentPct, finishSlip, open, byType, bySev, msSorted, next };
}

const STATUS_COLOR: Record<string, string> = { Green: "#00A676", Amber: "#E0B400", Red: "#DB504A" };
const MS_COLOR: Record<string, string> = { Complete: "#00A676", "On Track": "#3BA7E6", "At Risk": "#E0B400", Late: "#DB504A" };
const SEV_COLOR: Record<string, string> = { High: "#DB504A", Medium: "#E0B400", Low: "#3BA7E6" };

// ── Chart primitives ─────────────────────────────────────────────────────────

/** Half-circle gauge, 0–100. */
function Gauge({ value, color, track, text, label, size = 200 }: { value: number; color: string; track: string; text: string; label: string; size?: number }) {
  const r = 80, cx = 100, cy = 100, len = Math.PI * r;
  return (
    <svg viewBox="0 0 200 120" width={size} role="img" aria-label={`${label} ${value}`}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={track} strokeWidth="16" strokeLinecap="round" />
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke={color} strokeWidth="16" strokeLinecap="round"
        strokeDasharray={`${(len * clamp(value)) / 100} ${len}`}
      />
      <text x={cx} y={cy - 12} textAnchor="middle" fontSize="34" fontWeight="700" fill={text}>{value}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="11" fill={text} opacity="0.7">{label}</text>
    </svg>
  );
}

/** Full progress ring with optional glow. */
function Ring({ value, color, track, text, label, size = 180, glow = false, stroke = 14 }: { value: number; color: string; track: string; text: string; label: string; size?: number; glow?: boolean; stroke?: number }) {
  const r = 70, c = 2 * Math.PI * r;
  const id = `g${label.replace(/\W/g, "")}${value}`;
  return (
    <svg viewBox="0 0 180 180" width={size} role="img" aria-label={`${label} ${value}%`}>
      {glow && (
        <defs>
          <filter id={id} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
      )}
      <circle cx="90" cy="90" r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle
        cx="90" cy="90" r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${(c * clamp(value)) / 100} ${c}`} transform="rotate(-90 90 90)"
        filter={glow ? `url(#${id})` : undefined}
      />
      <text x="90" y="92" textAnchor="middle" fontSize="36" fontWeight="700" fill={text}>{value}%</text>
      <text x="90" y="116" textAnchor="middle" fontSize="11" fill={text} opacity="0.65" letterSpacing="1.5">{label.toUpperCase()}</text>
    </svg>
  );
}

/** Donut of segments, with total in the middle. */
function Donut({ parts, track, text, label, size = 170 }: { parts: { n: number; color: string }[]; track: string; text: string; label: string; size?: number }) {
  const r = 60, c = 2 * Math.PI * r, total = parts.reduce((s, x) => s + x.n, 0);
  let off = 0;
  return (
    <svg viewBox="0 0 160 160" width={size} role="img" aria-label={`${label}: ${total}`}>
      <circle cx="80" cy="80" r={r} fill="none" stroke={track} strokeWidth="20" />
      {total > 0 &&
        parts.filter((x) => x.n > 0).map((x, i) => {
          const len = (c * x.n) / total;
          const el = (
            <circle key={i} cx="80" cy="80" r={r} fill="none" stroke={x.color} strokeWidth="20"
              strokeDasharray={`${Math.max(len - 2, 0.5)} ${c}`} strokeDashoffset={-off} transform="rotate(-90 80 80)" />
          );
          off += len;
          return el;
        })}
      <text x="80" y="84" textAnchor="middle" fontSize="30" fontWeight="700" fill={text}>{total}</text>
      <text x="80" y="104" textAnchor="middle" fontSize="10" fill={text} opacity="0.65">{label}</text>
    </svg>
  );
}

/** Budget, actuals and forecast as horizontal bars on one scale. */
function BudgetBars({ p, colors, text, track, mono = false }: { p: Project; colors: [string, string, string]; text: string; track: string; mono?: boolean }) {
  const max = Math.max(p.budget, p.forecastAtCompletion, p.actualsToDate, 1) * 1.05;
  const rows = [
    { label: "Budget", v: p.budget, c: colors[0] },
    { label: "Actuals to date", v: p.actualsToDate, c: colors[1] },
    { label: "Forecast at completion", v: p.forecastAtCompletion, c: colors[2] },
  ];
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex justify-between text-[0.72rem]" style={{ color: text }}>
            <span className="opacity-75">{r.label}</span>
            <span className={`font-semibold ${mono ? "font-mono" : ""}`}>{money(r.v)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full" style={{ background: track }}>
            <div className="h-full rounded-full" style={{ width: `${(r.v / max) * 100}%`, background: r.c }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Milestones on a single date line, baseline ticks and forecast markers. */
function Timeline({ d, line, text, today: todayColor, height = 150 }: { d: ReturnType<typeof derive>; line: string; text: string; today: string; height?: number }) {
  const { p, msSorted } = d;
  const dates = [p.startDate, p.endDate, p.forecastCompletionDate, ...msSorted.flatMap((m) => [m.baselineDate, m.forecastDate])].map(ms);
  const t0 = Math.min(...dates), t1 = Math.max(...dates);
  const pad = (t1 - t0) * 0.05 || 86_400_000;
  const W = 800, L = 30, R = W - 30, Y = 70;
  const x = (t: number) => L + ((t - (t0 - pad)) / (t1 + pad - (t0 - pad))) * (R - L);
  const now = Date.now();
  const ticks: number[] = [];
  const a = new Date(t0 - pad);
  for (let m = Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + 1, 1); m < t1 + pad; m = Date.UTC(new Date(m).getUTCFullYear(), new Date(m).getUTCMonth() + 1, 1)) ticks.push(m);
  const every = Math.max(1, Math.ceil(ticks.length / 8));
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label="Milestone timeline">
      <line x1={L} x2={R} y1={Y} y2={Y} stroke={line} strokeWidth="2" />
      {ticks.map((t, i) =>
        i % every === 0 ? (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={Y - 4} y2={Y + 4} stroke={line} />
            <text x={x(t)} y={Y + 20} textAnchor="middle" fontSize="10" fill={text} opacity="0.55">
              {MONTHS[new Date(t).getUTCMonth()]} {String(new Date(t).getUTCFullYear()).slice(2)}
            </text>
          </g>
        ) : null,
      )}
      {now > t0 - pad && now < t1 + pad && (
        <g>
          <line x1={x(now)} x2={x(now)} y1={8} y2={height - 16} stroke={todayColor} strokeDasharray="4 4" />
          <text x={x(now)} y={height - 3} textAnchor="middle" fontSize="10" fontWeight="700" fill={todayColor}>Today</text>
        </g>
      )}
      <rect x={x(ms(p.startDate))} y={Y - 2} width={Math.max(x(ms(p.endDate)) - x(ms(p.startDate)), 2)} height="4" fill={line} opacity="0.9" />
      {msSorted.map((m, i) => {
        const fx = x(ms(m.forecastDate)), bx = x(ms(m.baselineDate));
        const up = i % 2 === 0;
        const ly = up ? Y - 30 : Y + 46;
        return (
          <g key={m.id}>
            {Math.abs(fx - bx) > 2 && <line x1={bx} x2={fx} y1={Y} y2={Y} stroke={MS_COLOR[m.status]} strokeWidth="4" opacity="0.5" />}
            <line x1={bx} x2={bx} y1={Y - 7} y2={Y + 7} stroke={text} strokeWidth="1.5" opacity="0.5" />
            <rect x={fx - 7} y={Y - 7} width="14" height="14" fill={MS_COLOR[m.status]} transform={`rotate(45 ${fx} ${Y})`} stroke="#fff" strokeWidth="1.5" />
            <text x={fx} y={ly} textAnchor="middle" fontSize="11" fontWeight="600" fill={text}>{m.name}</text>
            <text x={fx} y={ly + 13} textAnchor="middle" fontSize="9.5" fill={text} opacity="0.6">
              {fmtDate(m.forecastDate, false)}{slipDays(m) > 0 ? ` · +${slipDays(m)}d` : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Legend({ items, text }: { items: { label: string; color: string }[]; text: string }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.7rem]" style={{ color: text }}>
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5 opacity-80">
          <span className="h-2 w-2 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

const MS_LEGEND = Object.entries(MS_COLOR).map(([label, color]) => ({ label, color }));

// ── 1. Boardroom (Phoenix) ───────────────────────────────────────────────────

function Boardroom({ data }: { data: DashData }) {
  const d = derive(data), p = d.p;
  const navy = "#0B2545", gold = "#C9A227", ink = "#1C2B3A";
  const card = "rounded-md border border-[#E3E8EF] bg-white p-5 shadow-sm";
  return (
    <div className="overflow-hidden rounded-lg border border-[#E3E8EF] bg-[#F5F7FA]">
      <div className="flex flex-wrap items-end justify-between gap-4 px-8 py-6" style={{ background: navy }}>
        <div>
          <div className="text-[0.68rem] font-semibold uppercase tracking-[0.2em]" style={{ color: gold }}>{p.portfolio} · Steering Committee View</div>
          <h1 className="mt-1 text-3xl font-bold text-white">{p.name}</h1>
          <p className="mt-1 text-sm text-white/70">Sponsor {p.sponsor} · PM {p.projectManager} · Phase {p.phase}</p>
        </div>
        <span className="rounded px-3 py-1.5 text-sm font-bold text-white" style={{ background: STATUS_COLOR[p.status] }}>{p.status.toUpperCase()}</span>
      </div>
      <div className="h-1" style={{ background: gold }} />
      <div className="space-y-5 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { k: "% Complete", v: `${p.percentComplete}%` },
            { k: "Health score", v: String(p.healthScore) },
            { k: "Forecast finish", v: fmtDate(p.forecastCompletionDate), s: d.finishSlip > 0 ? `+${d.finishSlip} days vs plan` : "On plan" },
            { k: "Cost variance", v: `${d.variance >= 0 ? "+" : "−"}${money(Math.abs(d.variance))}`, s: `${d.spentPct}% of budget spent` },
          ].map((t) => (
            <div key={t.k} className={card} style={{ borderTop: `3px solid ${navy}` }}>
              <div className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-[#6B7A8C]">{t.k}</div>
              <div className="mt-2 text-2xl font-bold" style={{ color: navy }}>{t.v}</div>
              {t.s && <div className="mt-1 text-[0.72rem] text-[#6B7A8C]">{t.s}</div>}
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className={`${card} flex flex-col items-center`}>
            <div className="mb-2 self-start text-sm font-bold" style={{ color: navy }}>Project health</div>
            <Gauge value={p.healthScore} color={STATUS_COLOR[p.status]} track="#E8EDF3" text={ink} label="Health score" size={220} />
            <div className="mt-3 grid w-full grid-cols-2 gap-2 text-center text-[0.72rem]">
              <div className="rounded bg-[#F5F7FA] p-2"><div className="text-lg font-bold" style={{ color: navy }}>{p.scheduleRiskScore}</div>Schedule risk</div>
              <div className="rounded bg-[#F5F7FA] p-2"><div className="text-lg font-bold" style={{ color: navy }}>{p.budgetRiskScore}</div>Budget risk</div>
            </div>
          </div>
          <div className={card}>
            <div className="mb-4 text-sm font-bold" style={{ color: navy }}>Financials</div>
            <BudgetBars p={p} colors={[navy, "#5C7A99", gold]} text={ink} track="#E8EDF3" />
          </div>
          <div className={card}>
            <div className="mb-3 text-sm font-bold" style={{ color: navy }}>Executive summary</div>
            <p className="text-[0.82rem] leading-relaxed text-[#3D4B5C]">{p.executiveSummary}</p>
          </div>
        </div>
        <div className={card}>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-bold" style={{ color: navy }}>Milestones</div>
            <Legend items={MS_LEGEND} text={ink} />
          </div>
          <Timeline d={d} line="#9AAABB" text={ink} today={gold} />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className={`${card} lg:col-span-2`}>
            <div className="mb-3 text-sm font-bold" style={{ color: navy }}>Open RAID items</div>
            <RaidTable items={d.open} head={navy} />
          </div>
          <div className={card} style={{ borderLeft: `4px solid ${p.decisionNeeded ? "#DB504A" : gold}` }}>
            <div className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-[#6B7A8C]">{p.decisionNeeded ? "Decision needed" : "Recommended next"}</div>
            <p className="mt-2 text-[0.88rem] font-semibold leading-snug" style={{ color: navy }}>{p.decisionNeeded ?? p.recommendedActions[0]}</p>
            <ul className="mt-4 space-y-2 text-[0.78rem] text-[#3D4B5C]">
              {p.recommendedActions.slice(0, 3).map((a) => <li key={a} className="flex gap-2"><span style={{ color: gold }}>■</span>{a}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function RaidTable({ items, head, dark = false }: { items: RaidItem[]; head: string; dark?: boolean }) {
  if (!items.length) return <p className={`text-sm ${dark ? "text-white/60" : "text-[#6B7A8C]"}`}>No open items.</p>;
  return (
    <table className="w-full text-left text-[0.76rem]">
      <thead>
        <tr style={{ color: head }} className="text-[0.64rem] uppercase tracking-wider">
          <th className="pb-2 pr-2">Type</th><th className="pb-2 pr-2">Item</th><th className="pb-2 pr-2">Owner</th><th className="pb-2 pr-2">Due</th><th className="pb-2">Severity</th>
        </tr>
      </thead>
      <tbody>
        {items.map((r) => (
          <tr key={r.id} className={dark ? "border-t border-white/10" : "border-t border-[#E3E8EF]"}>
            <td className="py-2 pr-2 font-semibold">{r.type}</td>
            <td className="py-2 pr-2">{r.title}</td>
            <td className="py-2 pr-2 whitespace-nowrap">{r.owner}</td>
            <td className="py-2 pr-2 whitespace-nowrap">{fmtDate(r.dueDate, false)}</td>
            <td className="py-2"><span className="rounded px-1.5 py-0.5 text-[0.66rem] font-bold text-white" style={{ background: SEV_COLOR[r.severity] }}>{r.severity}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── 2. Mission Control (Atlas) ───────────────────────────────────────────────

function Mission({ data }: { data: DashData }) {
  const d = derive(data), p = d.p;
  const bg = "#070D1A", panel = "#0E1729", edge = "#1C2A44", cyan = "#22D3EE", lime = "#A3E635", text = "#DCE7F5";
  const box = "rounded-xl border p-5";
  return (
    <div className="rounded-2xl p-6" style={{ background: `radial-gradient(1200px 400px at 20% -10%, #12305A 0%, ${bg} 60%)`, color: text }}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[0.7rem] tracking-[0.25em]" style={{ color: cyan }}>// {p.code} · {p.portfolio.toUpperCase()}</div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">{p.name}</h1>
        </div>
        <div className="flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[0.72rem]" style={{ borderColor: edge, background: panel }}>
          <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: STATUS_COLOR[p.status], boxShadow: `0 0 10px ${STATUS_COLOR[p.status]}` }} />
          STATUS {p.status.toUpperCase()} · PHASE {p.phase.toUpperCase()}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-4">
        <div className={`${box} flex flex-col items-center justify-center lg:row-span-2`} style={{ borderColor: edge, background: panel }}>
          <Ring value={p.percentComplete} color={cyan} track="#16233B" text="#fff" label="Complete" size={210} glow stroke={12} />
          <div className="mt-4 w-full space-y-2 font-mono text-[0.72rem]">
            {[["HEALTH", p.healthScore, lime], ["SCHED RISK", p.scheduleRiskScore, "#F472B6"], ["BUDGET RISK", p.budgetRiskScore, "#FBBF24"]].map(([k, v, c]) => (
              <div key={k as string}>
                <div className="flex justify-between opacity-80"><span>{k}</span><span>{v}</span></div>
                <div className="mt-1 h-1.5 rounded-full" style={{ background: "#16233B" }}>
                  <div className="h-full rounded-full" style={{ width: `${v}%`, background: c as string, boxShadow: `0 0 8px ${c}` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        {[
          { k: "FORECAST FINISH", v: fmtDate(p.forecastCompletionDate), s: d.finishSlip <= 0 ? `${Math.abs(d.finishSlip)}d ahead of plan` : `+${d.finishSlip}d vs plan`, c: d.finishSlip <= 0 ? lime : "#F87171" },
          { k: "SPEND", v: money(p.actualsToDate), s: `${d.spentPct}% of ${money(p.budget)}`, c: cyan },
          { k: "FORECAST AT COMPLETION", v: money(p.forecastAtCompletion), s: `${d.variance <= 0 ? "under" : "over"} by ${money(Math.abs(d.variance))}`, c: d.variance <= 0 ? lime : "#F87171" },
        ].map((t) => (
          <div key={t.k} className={box} style={{ borderColor: edge, background: panel }}>
            <div className="font-mono text-[0.66rem] tracking-[0.2em] opacity-60">{t.k}</div>
            <div className="mt-2 text-2xl font-bold text-white">{t.v}</div>
            <div className="mt-1 font-mono text-[0.72rem]" style={{ color: t.c }}>{t.s}</div>
          </div>
        ))}
        <div className={`${box} lg:col-span-3`} style={{ borderColor: edge, background: panel }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[0.7rem] tracking-[0.2em]" style={{ color: cyan }}>MILESTONE TRACK</span>
            <Legend items={MS_LEGEND} text={text} />
          </div>
          <Timeline d={d} line="#2B3D5E" text={text} today={cyan} />
        </div>
        <div className={`${box} lg:col-span-2`} style={{ borderColor: edge, background: panel }}>
          <div className="mb-2 font-mono text-[0.7rem] tracking-[0.2em]" style={{ color: cyan }}>SITREP</div>
          <p className="text-[0.84rem] leading-relaxed opacity-90">{p.executiveSummary}</p>
          <div className="mt-4 font-mono text-[0.7rem] tracking-[0.2em]" style={{ color: lime }}>NEXT ACTIONS</div>
          <ul className="mt-2 space-y-1.5 text-[0.8rem]">
            {p.recommendedActions.slice(0, 3).map((a) => <li key={a} className="flex gap-2"><span style={{ color: lime }}>›</span>{a}</li>)}
          </ul>
        </div>
        <div className={`${box} lg:col-span-2`} style={{ borderColor: edge, background: panel }}>
          <div className="mb-3 font-mono text-[0.7rem] tracking-[0.2em]" style={{ color: cyan }}>OPEN RAID · {d.open.length}</div>
          {d.open.length === 0 ? <p className="text-sm opacity-60">No open items.</p> : (
            <ul className="space-y-2.5">
              {d.open.map((r) => (
                <li key={r.id} className="flex items-start gap-3 rounded-lg border p-3 text-[0.8rem]" style={{ borderColor: edge }}>
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: SEV_COLOR[r.severity], boxShadow: `0 0 8px ${SEV_COLOR[r.severity]}` }} />
                  <span className="flex-1"><span className="font-mono text-[0.66rem] opacity-60">{r.type.toUpperCase()} · {r.owner} · DUE {fmtDate(r.dueDate, false).toUpperCase()}</span><br />{r.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 3. Security Console (Sentinel) ───────────────────────────────────────────

function SecOps({ data }: { data: DashData }) {
  const d = derive(data), p = d.p;
  const bg = "#111418", tile = "#181C22", edge = "#262C35", green = "#3DDC97", text = "#C9D1D9";
  const Light = ({ ok, warn }: { ok: boolean; warn?: boolean }) => (
    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: ok ? green : warn ? "#E0B400" : "#F85149", boxShadow: `0 0 6px ${ok ? green : warn ? "#E0B400" : "#F85149"}` }} />
  );
  const seg = (v: number, invert = false) => {
    const filled = Math.round(v / 10);
    return (
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => {
          const on = i < filled;
          const col = invert ? (i >= 7 ? "#F85149" : i >= 4 ? "#E0B400" : green) : (i < 5 ? "#F85149" : i < 7 ? "#E0B400" : green);
          return <span key={i} className="h-4 flex-1 rounded-[2px]" style={{ background: on ? col : "#232933" }} />;
        })}
      </div>
    );
  };
  return (
    <div className="rounded-lg border p-5 font-mono" style={{ background: bg, borderColor: edge, color: text }}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b pb-4" style={{ borderColor: edge }}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded border text-lg" style={{ borderColor: green, color: green }}>⛨</span>
          <div>
            <div className="text-lg font-bold text-white">{p.name.toUpperCase()}</div>
            <div className="text-[0.7rem] opacity-60">{p.code} · OWNER {p.sponsor} · PM {p.projectManager}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[0.72rem]">
          <span className="flex items-center gap-2"><Light ok={p.status === "Green"} warn={p.status === "Amber"} /> POSTURE {p.status.toUpperCase()}</span>
          <span className="rounded border px-2 py-1" style={{ borderColor: edge }}>PHASE: {p.phase.toUpperCase()}</span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[
          { k: "COMPLETE", v: `${p.percentComplete}%`, ok: true },
          { k: "HEALTH", v: String(p.healthScore), ok: p.healthScore >= 75, warn: p.healthScore >= 50 },
          { k: "FINISH", v: fmtDate(p.forecastCompletionDate, false), ok: d.finishSlip <= 0, warn: d.finishSlip <= 30 },
          { k: "SPENT", v: `${d.spentPct}%`, ok: d.spentPct <= p.percentComplete + 10, warn: true },
          { k: "VARIANCE", v: `${d.variance <= 0 ? "−" : "+"}${money(Math.abs(d.variance))}`, ok: d.variance <= 0, warn: d.variance < p.budget * 0.05 },
          { k: "OPEN RAID", v: String(d.open.length), ok: !d.open.some((r) => r.severity === "High"), warn: true },
        ].map((t) => (
          <div key={t.k} className="rounded border p-3" style={{ background: tile, borderColor: edge }}>
            <div className="flex items-center justify-between text-[0.64rem] opacity-60">{t.k}<Light ok={t.ok} warn={t.warn} /></div>
            <div className="mt-2 text-xl font-bold text-white">{t.v}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="rounded border p-4" style={{ background: tile, borderColor: edge }}>
          <div className="mb-3 text-[0.7rem]" style={{ color: green }}>&gt; SIGNAL STRENGTH</div>
          <div className="space-y-3 text-[0.7rem]">
            <div><div className="mb-1 flex justify-between"><span>HEALTH</span><span>{p.healthScore}/100</span></div>{seg(p.healthScore)}</div>
            <div><div className="mb-1 flex justify-between"><span>SCHEDULE RISK</span><span>{p.scheduleRiskScore}/100</span></div>{seg(p.scheduleRiskScore, true)}</div>
            <div><div className="mb-1 flex justify-between"><span>BUDGET RISK</span><span>{p.budgetRiskScore}/100</span></div>{seg(p.budgetRiskScore, true)}</div>
            <div><div className="mb-1 flex justify-between"><span>DELIVERY</span><span>{p.percentComplete}%</span></div>{seg(p.percentComplete)}</div>
          </div>
        </div>
        <div className="rounded border p-4 lg:col-span-2" style={{ background: tile, borderColor: edge }}>
          <div className="mb-3 text-[0.7rem]" style={{ color: green }}>&gt; MILESTONE LOG</div>
          <table className="w-full text-[0.74rem]">
            <thead><tr className="text-left text-[0.62rem] opacity-50"><th className="pb-2">ST</th><th className="pb-2">MILESTONE</th><th className="pb-2">BASELINE</th><th className="pb-2">FORECAST</th><th className="pb-2 text-right">DRIFT</th></tr></thead>
            <tbody>
              {d.msSorted.map((m) => (
                <tr key={m.id} className="border-t" style={{ borderColor: edge }}>
                  <td className="py-2"><Light ok={m.status === "Complete" || m.status === "On Track"} warn={m.status === "At Risk"} /></td>
                  <td className="py-2 text-white">{m.name}</td>
                  <td className="py-2 opacity-70">{m.baselineDate}</td>
                  <td className="py-2">{m.forecastDate}</td>
                  <td className="py-2 text-right" style={{ color: slipDays(m) > 0 ? "#F85149" : green }}>{slipDays(m) > 0 ? `+${slipDays(m)}d` : `${slipDays(m)}d`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded border p-4 lg:col-span-2" style={{ background: tile, borderColor: edge }}>
          <div className="mb-2 text-[0.7rem]" style={{ color: green }}>&gt; BRIEFING</div>
          <p className="text-[0.78rem] leading-relaxed">{p.executiveSummary}</p>
          <div className="mt-3 text-[0.7rem]" style={{ color: green }}>&gt; RAID FEED</div>
          {d.open.length === 0 ? <p className="mt-1 text-[0.76rem] opacity-60">No open items.</p> : d.open.map((r) => (
            <div key={r.id} className="mt-1.5 text-[0.76rem]">
              <span style={{ color: SEV_COLOR[r.severity] }}>[{r.severity.toUpperCase()}]</span> <span className="opacity-60">{r.type.toLowerCase()} · {r.owner} ·</span> {r.title}
            </div>
          ))}
        </div>
        <div className="rounded border p-4" style={{ background: tile, borderColor: edge }}>
          <div className="mb-2 text-[0.7rem]" style={{ color: green }}>&gt; RUNBOOK</div>
          <ol className="space-y-2 text-[0.76rem]">
            {p.recommendedActions.slice(0, 4).map((a, i) => <li key={a}><span style={{ color: green }}>{String(i + 1).padStart(2, "0")}</span> {a}</li>)}
          </ol>
        </div>
      </div>
    </div>
  );
}

// ── 4. Editorial (Compass) ───────────────────────────────────────────────────

function Editorial({ data }: { data: DashData }) {
  const d = derive(data), p = d.p;
  const paper = "#F6F1E7", ink = "#2A2420", terra = "#B85042", sage = "#7D9A84", rule = "#D9CFBF";
  const serif = { fontFamily: "Georgia, 'Times New Roman', serif" };
  return (
    <div className="rounded-sm px-8 py-8" style={{ background: paper, color: ink }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 pb-3" style={{ borderColor: ink }}>
        <span className="text-[0.7rem] uppercase tracking-[0.3em]">{p.portfolio} · Board Pack</span>
        <span className="text-[0.7rem] uppercase tracking-[0.3em]">{fmtDate(new Date().toISOString().slice(0, 10))}</span>
      </div>
      <h1 className="mt-6 text-5xl leading-tight" style={serif}>{p.name}</h1>
      <p className="mt-2 text-sm italic opacity-70" style={serif}>Sponsored by {p.sponsor}, led by {p.projectManager}. Currently in {p.phase.toLowerCase()}.</p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="text-xl leading-relaxed first-letter:float-left first-letter:mr-2 first-letter:text-6xl first-letter:leading-[0.85]" style={{ ...serif, color: ink }}>
            {p.executiveSummary}
          </p>
          {p.decisionNeeded && (
            <blockquote className="mt-8 border-l-4 pl-5 text-2xl italic leading-snug" style={{ ...serif, borderColor: terra, color: terra }}>
              “{p.decisionNeeded}”
              <div className="mt-2 text-[0.7rem] not-italic uppercase tracking-[0.25em]" style={{ color: ink }}>Decision needed from the board</div>
            </blockquote>
          )}
          <h2 className="mt-10 border-b pb-2 text-[0.7rem] uppercase tracking-[0.3em]" style={{ borderColor: rule }}>What we recommend</h2>
          <ol className="mt-3 space-y-3">
            {p.recommendedActions.map((a, i) => (
              <li key={a} className="flex gap-4 text-[0.95rem]" style={serif}>
                <span className="text-2xl leading-none" style={{ color: terra }}>{i + 1}</span>{a}
              </li>
            ))}
          </ol>
        </div>
        <aside className="space-y-8">
          {[
            { k: "Complete", v: `${p.percentComplete}%`, s: `${p.phase} phase` },
            { k: "Health", v: String(p.healthScore), s: `${p.status} status` },
            { k: "Forecast at completion", v: money(p.forecastAtCompletion), s: `${d.variance >= 0 ? "over" : "under"} a ${money(p.budget)} budget by ${money(Math.abs(d.variance))}` },
            { k: "Finish", v: fmtDate(p.forecastCompletionDate, false), s: d.finishSlip > 0 ? `${d.finishSlip} days later than planned` : "on plan" },
          ].map((t) => (
            <div key={t.k} className="border-t pt-3" style={{ borderColor: rule }}>
              <div className="text-[0.66rem] uppercase tracking-[0.3em] opacity-70">{t.k}</div>
              <div className="text-5xl" style={{ ...serif, color: terra }}>{t.v}</div>
              <div className="mt-1 text-[0.8rem] italic opacity-75" style={serif}>{t.s}</div>
            </div>
          ))}
        </aside>
      </div>

      <h2 className="mt-12 border-b pb-2 text-[0.7rem] uppercase tracking-[0.3em]" style={{ borderColor: rule }}>The road ahead</h2>
      <div className="mt-2"><Timeline d={d} line={ink} text={ink} today={terra} /></div>

      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="border-b pb-2 text-[0.7rem] uppercase tracking-[0.3em]" style={{ borderColor: rule }}>Where the money is</h2>
          <div className="mt-4"><BudgetBars p={p} colors={[ink, sage, terra]} text={ink} track="#E7DFD1" /></div>
        </div>
        <div>
          <h2 className="border-b pb-2 text-[0.7rem] uppercase tracking-[0.3em]" style={{ borderColor: rule }}>Risks we are watching</h2>
          {d.open.length === 0 ? <p className="mt-3 italic" style={serif}>Nothing open.</p> : (
            <ul className="mt-3 space-y-3">
              {d.open.map((r) => (
                <li key={r.id} className="text-[0.92rem]" style={serif}>
                  <span className="text-[0.66rem] uppercase tracking-[0.2em]" style={{ color: r.severity === "High" ? terra : sage, fontFamily: "inherit" }}>{r.type} · {r.severity}</span>
                  <br />{r.title} <span className="italic opacity-60">— {r.owner}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 5. Modern SaaS (Beacon) ──────────────────────────────────────────────────

function Saas({ data }: { data: DashData }) {
  const d = derive(data), p = d.p;
  const violet = "#7C3AED", teal = "#14B8A6", pink = "#EC4899", ink = "#1E1B4B", muted = "#6B7280";
  const card = "rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgba(76,29,149,0.08)]";
  const typeColor: Record<string, string> = { Risk: violet, Issue: pink, Decision: "#F59E0B", Dependency: teal, Assumption: "#64748B" };
  const msCounts = (["Complete", "On Track", "At Risk", "Late"] as const).map((s) => ({ s, n: d.msSorted.filter((m) => m.status === s).length }));
  return (
    <div className="rounded-3xl bg-[#F7F5FF] p-5">
      <div className="rounded-2xl p-7 text-white" style={{ background: `linear-gradient(120deg, ${violet} 0%, #6366F1 45%, ${teal} 100%)` }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="rounded-full bg-white/20 px-3 py-1 text-[0.7rem] font-semibold backdrop-blur">{p.portfolio}</span>
            <h1 className="mt-3 text-3xl font-extrabold">{p.name}</h1>
            <p className="mt-1 text-sm text-white/80">{p.phase} phase · PM {p.projectManager} · finishing {fmtDate(p.forecastCompletionDate)}</p>
          </div>
          <div className="flex gap-6">
            <Ring value={p.percentComplete} color="#fff" track="rgba(255,255,255,0.25)" text="#fff" label="Done" size={130} stroke={12} />
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { k: "Health score", v: p.healthScore, c: violet, suffix: "/100" },
          { k: "Spent", v: d.spentPct, c: teal, suffix: "% of budget" },
          { k: "Schedule risk", v: p.scheduleRiskScore, c: pink, suffix: "/100" },
          { k: "Open RAID", v: d.open.length, c: "#F59E0B", suffix: " items" },
        ].map((t) => (
          <div key={t.k} className={card}>
            <div className="flex items-center gap-2 text-[0.75rem] font-medium" style={{ color: muted }}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.c }} />{t.k}
            </div>
            <div className="mt-2 text-3xl font-extrabold" style={{ color: ink }}>{t.v}<span className="text-sm font-medium" style={{ color: muted }}>{t.suffix}</span></div>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className={`${card} flex flex-col items-center`}>
          <div className="self-start text-sm font-bold" style={{ color: ink }}>Milestones by status</div>
          <Donut parts={msCounts.map((x) => ({ n: x.n, color: MS_COLOR[x.s] }))} track="#EEF0F7" text={ink} label="milestones" />
          <Legend items={msCounts.map((x) => ({ label: `${x.s} ${x.n}`, color: MS_COLOR[x.s] }))} text={ink} />
        </div>
        <div className={`${card} flex flex-col items-center`}>
          <div className="self-start text-sm font-bold" style={{ color: ink }}>Open RAID by type</div>
          <Donut parts={d.byType.map((x) => ({ n: x.n, color: typeColor[x.type] }))} track="#EEF0F7" text={ink} label="open items" />
          <Legend items={d.byType.map((x) => ({ label: `${x.type} ${x.n}`, color: typeColor[x.type] }))} text={ink} />
        </div>
        <div className={card}>
          <div className="mb-4 text-sm font-bold" style={{ color: ink }}>Budget</div>
          <BudgetBars p={p} colors={[violet, teal, pink]} text={ink} track="#EEF0F7" />
          <div className="mt-4 rounded-xl px-3 py-2 text-[0.78rem] font-semibold" style={{ background: d.variance <= 0 ? "#DCFCE7" : "#FCE7F3", color: d.variance <= 0 ? "#166534" : "#9D174D" }}>
            {d.variance <= 0 ? "Under" : "Over"} budget by {money(Math.abs(d.variance))} at completion
          </div>
        </div>
      </div>
      <div className={`${card} mt-5`}>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-bold" style={{ color: ink }}>Timeline</div>
          <Legend items={MS_LEGEND} text={ink} />
        </div>
        <Timeline d={d} line="#C7C2F0" text={ink} today={violet} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className={card}>
          <div className="mb-2 text-sm font-bold" style={{ color: ink }}>✨ Summary</div>
          <p className="text-[0.85rem] leading-relaxed" style={{ color: "#374151" }}>{p.executiveSummary}</p>
        </div>
        <div className={card}>
          <div className="mb-3 text-sm font-bold" style={{ color: ink }}>Next up</div>
          <div className="space-y-2">
            {p.recommendedActions.slice(0, 3).map((a, i) => (
              <div key={a} className="flex items-start gap-3 rounded-xl bg-[#F7F5FF] p-3 text-[0.8rem]" style={{ color: "#374151" }}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold text-white" style={{ background: [violet, teal, pink][i] }}>{i + 1}</span>{a}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ShowcaseDashboard({ data }: { data: DashData }) {
  switch (styleFor(data.project.id).key) {
    case "mission": return <Mission data={data} />;
    case "secops": return <SecOps data={data} />;
    case "editorial": return <Editorial data={data} />;
    case "saas": return <Saas data={data} />;
    default: return <Boardroom data={data} />;
  }
}
