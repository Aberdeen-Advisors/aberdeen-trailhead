import type { HealthStatus, MilestoneStatus } from "@/lib/types";

export { fmtMoney } from "@/lib/format";

const statusColors: Record<HealthStatus, string> = {
  Green: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Red: "bg-red-500/15 text-red-400 border-red-500/30",
};

export function HealthBadge({ status }: { status: HealthStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === "Green" ? "bg-emerald-400" : status === "Amber" ? "bg-amber-400" : "bg-red-400"}`} />
      {status}
    </span>
  );
}

const msColors: Record<MilestoneStatus, string> = {
  Complete: "text-emerald-400",
  "On Track": "text-sky-400",
  "At Risk": "text-amber-400",
  Late: "text-red-400",
};

export function MilestoneStatusLabel({ status }: { status: MilestoneStatus }) {
  return <span className={`text-xs font-medium ${msColors[status]}`}>{status}</span>;
}

export function Panel({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-hv-border bg-hv-panel p-5 shadow-sm ${className}`}>
      {title && <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-hv-muted">{title}</h2>}
      {children}
    </section>
  );
}

export function KpiCard({ label, value, sub, tone = "default" }: { label: string; value: string; sub?: string; tone?: "default" | "good" | "warn" | "bad" }) {
  const toneCls = { default: "text-hv-text", good: "text-emerald-400", warn: "text-amber-400", bad: "text-red-400" }[tone];
  return (
    <div className="rounded-xl border border-hv-border bg-hv-panel p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wider text-hv-muted">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${toneCls}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-hv-muted">{sub}</div>}
    </div>
  );
}

export function ScoreBar({ label, score, invert = false }: { label: string; score: number; invert?: boolean }) {
  // invert=true means higher is worse (risk scores)
  const good = invert ? score < 40 : score >= 75;
  const bad = invert ? score >= 70 : score < 50;
  const color = good ? "bg-emerald-500" : bad ? "bg-red-500" : "bg-amber-500";
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-hv-muted">{label}</span>
        <span className="font-medium text-hv-text">{score}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-hv-border">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
    </div>
  );
}
