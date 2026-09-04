import type { HealthStatus, MilestoneStatus } from "@/lib/types";

export { fmtMoney } from "@/lib/format";

// ── Lane chips ────────────────────────────────────────────────────────────────
// The marketing site tags every KPI card with the capability lane it belongs to
// (.fc-chip-delivery / -intel / -adoption). Reused here so a card in the portal
// reads the same way as its counterpart on the site.

export type Lane = "delivery" | "intel" | "adoption";

const laneStyles: Record<Lane, string> = {
  delivery: "bg-navy",
  intel: "bg-azure",
  adoption: "bg-teal-bright",
};

export function LaneChip({ lane }: { lane: Lane }) {
  return <span className={`hv-chip ${laneStyles[lane]}`}>{lane}</span>;
}

// ── Page header ───────────────────────────────────────────────────────────────

export function PageHeader({
  kicker,
  title,
  sub,
  actions,
}: {
  kicker?: string;
  title: string;
  sub?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {kicker && <div className="hv-kicker mb-2">{kicker}</div>}
        <h1 className="text-[1.75rem] font-bold tracking-tight text-navy">{title}</h1>
        {sub && <p className="mt-2 max-w-3xl text-sm font-light leading-relaxed text-hv-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ── Status badges ─────────────────────────────────────────────────────────────

const statusColors: Record<HealthStatus, string> = {
  Green: "border-emerald-500/35 bg-emerald-50 text-emerald-300",
  Amber: "border-amber-500/50 bg-amber-50 text-amber-300",
  Red: "border-red-500/35 bg-red-50 text-red-300",
};

const statusDot: Record<HealthStatus, string> = {
  Green: "bg-emerald-500",
  Amber: "bg-amber-500",
  Red: "bg-red-500",
};

export function HealthBadge({ status }: { status: HealthStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold ${statusColors[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${statusDot[status]}`} />
      {status}
    </span>
  );
}

const msColors: Record<MilestoneStatus, string> = {
  Complete: "text-emerald-300",
  "On Track": "text-sky-300",
  "At Risk": "text-amber-300",
  Late: "text-red-300",
};

export function MilestoneStatusLabel({ status }: { status: MilestoneStatus }) {
  return <span className={`shrink-0 text-xs font-semibold ${msColors[status]}`}>{status}</span>;
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`hv-card p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-hv-border pb-3">
          {title && <h2 className="hv-kicker">{title}</h2>}
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────

type Tone = "default" | "good" | "warn" | "bad";

const toneValue: Record<Tone, string> = {
  default: "text-navy",
  good: "text-emerald-500",
  warn: "text-amber-400",
  bad: "text-red-500",
};

const toneSub: Record<Tone, string> = {
  default: "text-hv-muted",
  good: "text-emerald-300",
  warn: "text-amber-300",
  bad: "text-red-300",
};

export function KpiCard({
  label,
  value,
  sub,
  tone = "default",
  lane,
  spark,
  children,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  lane?: Lane;
  spark?: number[];
  children?: React.ReactNode;
}) {
  return (
    <div className="hv-card hv-lift p-4">
      <div className="mb-1.5 flex items-center gap-1.5">
        {lane && <LaneChip lane={lane} />}
        <span className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-hv-subtle">
          {label}
        </span>
      </div>
      <div className={`hv-num text-[1.75rem] font-bold leading-[1.15] ${toneValue[tone]}`}>{value}</div>
      {spark && <Sparkline points={spark} />}
      {children}
      {sub && <div className={`hv-num mt-1.5 text-[0.72rem] ${toneSub[tone]}`}>{sub}</div>}
    </div>
  );
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

export function Sparkline({
  points,
  color = "#44B0B1",
  className = "",
}: {
  points: number[];
  color?: string;
  className?: string;
}) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = 120 / (points.length - 1);
  const d = points
    .map((p, i) => `${(i * step).toFixed(1)},${(30 - ((p - min) / span) * 26).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox="0 0 120 34" className={`mt-2 block h-[34px] w-full ${className}`} aria-hidden="true">
      <polyline points={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Segmented RAG bar (the site's .fc-seg-bar) ───────────────────────────────

export function SegmentBar({ green, amber, red }: { green: number; amber: number; red: number }) {
  const total = green + amber + red || 1;
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="mt-1">
      <div className="flex h-3.5 overflow-hidden rounded bg-hv-border">
        {green > 0 && <span className="block h-full bg-emerald-500" style={{ width: pct(green) }} />}
        {amber > 0 && <span className="block h-full bg-amber-500" style={{ width: pct(amber) }} />}
        {red > 0 && <span className="block h-full bg-red-500" style={{ width: pct(red) }} />}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[0.68rem] font-semibold text-hv-muted">
        <span className="inline-flex items-center gap-1.5">
          <i className="h-[7px] w-[7px] rounded-full bg-emerald-500" />
          {green} Green
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-[7px] w-[7px] rounded-full bg-amber-500" />
          {amber} Amber
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-[7px] w-[7px] rounded-full bg-red-500" />
          {red} Red
        </span>
      </div>
    </div>
  );
}

// ── Phase track (the site's .fc-phase-track) ─────────────────────────────────

export function PhaseTrack({
  phases,
}: {
  phases: { label: string; state: "done" | "current" | "upcoming" }[];
}) {
  return (
    <div className="hv-scroll-x">
      <div className="flex min-w-max items-center gap-1">
        {phases.map((p, i) => (
          <div key={p.label} className="flex items-center gap-1">
            {i > 0 && (
              <span
                className={`block h-[2px] w-8 rounded-full ${
                  phases[i - 1].state === "done" && p.state === "done"
                    ? "bg-navy"
                    : p.state === "current"
                      ? "bg-gradient-to-r from-navy to-teal-bright"
                      : "bg-hv-border"
                }`}
              />
            )}
            <span
              className={`whitespace-nowrap rounded px-2.5 py-1 text-[0.7rem] font-bold ${
                p.state === "done"
                  ? "bg-navy text-white"
                  : p.state === "current"
                    ? "bg-teal-bright text-white"
                    : "bg-hv-border text-hv-muted"
              }`}
            >
              {p.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Score bar ─────────────────────────────────────────────────────────────────

export function ScoreBar({ label, score, invert = false }: { label: string; score: number; invert?: boolean }) {
  // invert=true means higher is worse (risk scores)
  const good = invert ? score < 40 : score >= 75;
  const bad = invert ? score >= 70 : score < 50;
  const color = good ? "bg-emerald-500" : bad ? "bg-red-500" : "bg-amber-500";
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate text-hv-muted">{label}</span>
        <span className="hv-num shrink-0 font-semibold text-navy">{score}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-hv-border">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }} />
      </div>
    </div>
  );
}

// ── Notice ────────────────────────────────────────────────────────────────────

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-hv border border-azure/25 bg-azure-tint px-4 py-3 text-xs leading-relaxed text-azure-ink">
      <span aria-hidden="true" className="mt-px font-bold">
        ⓘ
      </span>
      <p>{children}</p>
    </div>
  );
}
