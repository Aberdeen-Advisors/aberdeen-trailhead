import type { Milestone } from "@/lib/types";

// Milestone timeline, Gantt-style. Rendered as inline SVG on the server: no
// client bundle, and the Aberdeen palette applies directly.
//
// The model stores each milestone as two point dates (baseline and forecast)
// rather than a start/finish pair, so a bar here spans baseline → forecast and
// its length *is* the slip. A milestone that has not moved shows as a diamond.
// Nothing is invented: no durations are synthesised for milestones.

const C = {
  navy: "#09375F",
  teal: "#44B0B1",
  tealTint: "#D9F0F0",
  jade: "#00A676",
  gold: "#F7D002",
  jasper: "#DB504A",
  deepSky: "#5CC8FF",
  rule: "#DDE7ED",
  onyx: "#404040",
  subtle: "#97A5AE",
} as const;

const statusFill: Record<string, string> = {
  Complete: C.jade,
  "On Track": C.deepSky,
  "At Risk": C.gold,
  Late: C.jasper,
};

// Geometry, in viewBox units.
const W = 760;
const GUTTER = 178; // milestone-name column
const CX = GUTTER + 8; // chart left edge
const CR = W - 16; // chart right edge
const CHART_W = CR - CX;
// Two label bands in the axis: "Today" on top, month ticks below, so they
// cannot collide when today falls near a month boundary.
const AXIS_H = 38;
const TODAY_LABEL_Y = 10;
const MONTH_LABEL_Y = 26;
const ROW_H = 38;
const PAD_B = 12;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ts = (iso: string): number => Date.parse(iso);
const ok = (n: number): boolean => !Number.isNaN(n);

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";
}

/** Month-start ticks across the domain, thinned to roughly seven labels. */
function monthTicks(t0: number, t1: number): number[] {
  const a = new Date(t0);
  const out: number[] = [];
  const cur = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), 1);
  let d = new Date(cur);
  while (d.getTime() <= t1) {
    if (d.getTime() >= t0) out.push(d.getTime());
    d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  }
  const step = Math.max(1, Math.ceil(out.length / 7));
  return out.filter((_, i) => i % step === 0);
}

const label = (t: number): string => {
  const d = new Date(t);
  return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`;
};

export function MilestoneGantt({
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
  const rows = milestones
    .map((m) => ({ m, b: ts(m.baselineDate), f: ts(m.forecastDate) }))
    .filter((r) => ok(r.b) && ok(r.f))
    .sort((a, b) => a.f - b.f);

  const pStart = ts(startDate);
  const pEnd = ts(endDate);
  const pForecast = ts(forecastEndDate);

  if (!rows.length || !ok(pStart) || !ok(pEnd)) {
    return <p className="text-sm text-hv-subtle">No dated milestones to plot.</p>;
  }

  // Domain covers the project window and every milestone date, padded slightly.
  const lo = Math.min(pStart, ...rows.map((r) => Math.min(r.b, r.f)));
  const hi = Math.max(pEnd, ok(pForecast) ? pForecast : pEnd, ...rows.map((r) => Math.max(r.b, r.f)));
  const span = Math.max(hi - lo, 86_400_000);
  const pad = span * 0.03;
  const t0 = lo - pad;
  const t1 = hi + pad;

  const x = (t: number): number => CX + ((t - t0) / (t1 - t0)) * CHART_W;

  const ticks = monthTicks(t0, t1);
  const today = Date.now();
  const showToday = today >= t0 && today <= t1;

  const rowCount = rows.length + 1; // +1 for the project-window row
  const H = AXIS_H + rowCount * ROW_H + PAD_B;
  const rowY = (i: number): number => AXIS_H + i * ROW_H + ROW_H / 2;

  const slipDays = (b: number, f: number): number => Math.round((f - b) / 86_400_000);

  return (
    <div>
      <div className="hv-scroll-x">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[560px]"
          role="img"
          aria-label="Milestone timeline showing baseline and forecast dates"
        >
          {/* Vertical gridlines + month labels */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={AXIS_H - 6} y2={H - PAD_B} stroke={C.rule} strokeWidth="1" />
              <text x={x(t)} y={MONTH_LABEL_Y} textAnchor="middle" fontSize="10" fill={C.subtle}>
                {label(t)}
              </text>
            </g>
          ))}

          {/* Chart baseline rule */}
          <line x1={CX} x2={CR} y1={AXIS_H - 6} y2={AXIS_H - 6} stroke={C.rule} strokeWidth="1" />

          {/* Today */}
          {showToday && (
            <g>
              <line
                x1={x(today)}
                x2={x(today)}
                y1={TODAY_LABEL_Y + 3}
                y2={H - PAD_B}
                stroke={C.teal}
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <text
                x={x(today)}
                y={TODAY_LABEL_Y}
                textAnchor="middle"
                fontSize="9"
                fontWeight="600"
                fill={C.teal}
              >
                Today
              </text>
            </g>
          )}

          {/* Project window */}
          <g>
            <text x={0} y={rowY(0) + 4} fontSize="11" fontWeight="600" fill={C.navy}>
              Project window
            </text>
            <rect
              x={x(pStart)}
              y={rowY(0) - 7}
              width={Math.max(x(pEnd) - x(pStart), 2)}
              height={14}
              rx={3}
              fill={C.navy}
              opacity={0.85}
            >
              <title>{`Baseline ${startDate} → ${endDate}`}</title>
            </rect>
            {ok(pForecast) && pForecast > pEnd && (
              <rect
                x={x(pEnd)}
                y={rowY(0) - 7}
                width={Math.max(x(pForecast) - x(pEnd), 2)}
                height={14}
                rx={3}
                fill={C.jasper}
              >
                <title>{`AI forecast finish ${forecastEndDate} — ${slipDays(pEnd, pForecast)} days past baseline`}</title>
              </rect>
            )}
          </g>

          {/* Milestones */}
          {rows.map(({ m, b, f }, i) => {
            const y = rowY(i + 1);
            const moved = b !== f;
            const late = f > b;
            const barFrom = Math.min(b, f);
            const barTo = Math.max(b, f);
            const fill = statusFill[m.status] ?? C.subtle;
            const detail = moved
              ? `${m.name} — baseline ${m.baselineDate}, forecast ${m.forecastDate} (${late ? "+" : ""}${slipDays(b, f)} days)`
              : `${m.name} — ${m.baselineDate}, on baseline`;

            return (
              <g key={m.id}>
                <title>{detail}</title>
                <text x={0} y={y + 4} fontSize="11" fill={C.onyx}>
                  {truncate(m.name, 26)}
                </text>

                {moved ? (
                  <>
                    {/* Slip band: baseline → forecast */}
                    <rect
                      x={x(barFrom)}
                      y={y - 5}
                      width={Math.max(x(barTo) - x(barFrom), 3)}
                      height={10}
                      rx={2}
                      fill={late ? C.jasper : C.jade}
                      opacity={0.35}
                    />
                    {/* Baseline tick */}
                    <line x1={x(b)} x2={x(b)} y1={y - 9} y2={y + 9} stroke={C.navy} strokeWidth="2" />
                    {/* Forecast marker */}
                    <circle cx={x(f)} cy={y} r={5.5} fill={fill} stroke="#FFFFFF" strokeWidth="1.5" />
                    {/* A few weeks of slip is only a pixel or two on a multi-month
                        axis, so state the magnitude rather than distorting the scale. */}
                    {(() => {
                      const d = slipDays(b, f);
                      const flip = x(barTo) > CR - 46;
                      return (
                        <text
                          x={flip ? x(barFrom) - 9 : x(barTo) + 9}
                          y={y + 3.5}
                          textAnchor={flip ? "end" : "start"}
                          fontSize="9.5"
                          fontWeight="700"
                          fill={late ? C.jasper : C.jade}
                        >
                          {`${d > 0 ? "+" : ""}${d}d`}
                        </text>
                      );
                    })()}
                  </>
                ) : (
                  /* Unmoved: a diamond on the date */
                  <rect
                    x={x(b) - 5}
                    y={y - 5}
                    width={10}
                    height={10}
                    fill={fill}
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    transform={`rotate(45 ${x(b)} ${y})`}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-hv-border pt-3 text-[0.7rem] text-hv-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-0.5" style={{ background: C.navy }} /> Baseline date
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-white" style={{ background: C.gold }} /> Forecast
          date
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-5 rounded-sm" style={{ background: C.jasper, opacity: 0.35 }} /> Slip
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-5 rounded-sm" style={{ background: C.navy, opacity: 0.85 }} /> Project window
        </span>
        <span className="ml-auto font-light text-hv-subtle">Hover a bar for exact dates</span>
      </div>
    </div>
  );
}
