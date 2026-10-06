import { NextResponse } from "next/server";
import { getSessionUser } from "@/auth";
import { hasSupabase, sbSelect } from "@/lib/supabase";
import { isDbProject } from "@/lib/registry";
import { calcHealth, calcPercentComplete } from "@/lib/health";
import { getProject, getRaid } from "@/lib/data/provider";

export const dynamic = "force-dynamic";

// Live data for a project's HTML dashboard (public/dashboards/<id>.html),
// assembled from Supabase in the same shape as the bundled sample JSON.
// Requires sign-in; when unavailable the dashboard falls back to sample data.

type Row = Record<string, any>;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (d: string) => `${MON[Number(d.slice(5, 7)) - 1]} ${d.slice(2, 4)}`;
const weekLabel = (d: string) => `${MON[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`;
const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const id = params.id;
  if (!(await isDbProject(id))) return NextResponse.json({ error: "Unknown project" }, { status: 404 });

  try {
    const f = `project_id=eq.${encodeURIComponent(id)}`;
    const [proj, pRaid, acts] = await Promise.all([
      getProject(id),
      getRaid(id),
      sbSelect("activities", `${f}&select=workstream_id,status,start_date,target_date,pct_complete,update_type`),
    ]);
    const [projects, ws, fin, defects, ms, raid] = (await Promise.all([
      sbSelect("projects", `id=eq.${encodeURIComponent(id)}`),
      sbSelect("workstreams", `${f}&order=sort_order.asc,name.asc`),
      sbSelect("financials", `${f}&order=month.asc`),
      sbSelect("defect_counts", `${f}&order=week_of.asc`),
      sbSelect("milestones", `${f}&order=forecast_date.asc.nullslast`),
      sbSelect("raid_items", `${f}&order=created_at.asc`),
    ])) as Row[][];
    const p: Row = projects[0];
    if (!p) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const wsName = new Map<string, string>(ws.map((w: Row) => [w.id, w.name]));
    const names = ws.map((w: Row) => w.name as string);

    // Budget burn by workstream ($K, cumulative)
    const months = Array.from(new Set(fin.map((r: Row) => String(r.month)))).sort();
    const byWorkstream: Record<string, { plan: (number | null)[]; actual: (number | null)[]; forecast: (number | null)[] }> = {};
    const budgetByWorkstream: Record<string, number> = {};
    for (const n of names) byWorkstream[n] = { plan: months.map(() => null), actual: months.map(() => null), forecast: months.map(() => null) };
    for (const r of fin) {
      const n = wsName.get(r.workstream_id);
      if (!n) continue;
      const i = months.indexOf(String(r.month));
      byWorkstream[n].plan[i] = num(r.plan_k);
      byWorkstream[n].actual[i] = num(r.actual_k);
      byWorkstream[n].forecast[i] = num(r.forecast_k);
      if (r.workstream_budget != null) budgetByWorkstream[n] = Number(r.workstream_budget);
    }
    for (const n of names) if (budgetByWorkstream[n] == null) budgetByWorkstream[n] = 0;

    // Weekly open defects by workstream
    const weeks = Array.from(new Set(defects.map((r: Row) => String(r.week_of)))).sort();
    const defectsBy: Record<string, number[]> = {};
    for (const n of names) defectsBy[n] = weeks.map(() => 0);
    for (const r of defects) {
      const n = wsName.get(r.workstream_id);
      if (n) defectsBy[n][weeks.indexOf(String(r.week_of))] = Number(r.open_count) || 0;
    }

    const last = (a: (number | null)[]) => { for (let i = a.length - 1; i >= 0; i--) if (a[i] != null) return a[i] as number; return 0; };
    const actualsToDate = names.reduce((s, n) => s + last(byWorkstream[n].actual), 0) * 1000;
    const forecastAtCompletion = names.reduce((s, n) => s + last(byWorkstream[n].forecast), 0) * 1000;
    const openDefects = names.reduce((s, n) => s + (defectsBy[n][weeks.length - 1] ?? 0), 0);
    const goLive = ms.find((m: Row) => /go[- ]?live/i.test(m.name)) ?? ms[ms.length - 1];

    // Workstream progress, plan and health come from each workstream's own tasks
    // and milestones (stored values are used only when a workstream has no plan yet).
    const today = new Date().toISOString().slice(0, 10);
    const planned = (tasks: Row[]): number | null => {
      let total = 0, due = 0;
      for (const t of tasks) {
        if (!t.start_date || !t.target_date) continue;
        const s0 = Date.parse(String(t.start_date)), e0 = Date.parse(String(t.target_date)) + 86_400_000;
        const d = Math.max(1, (e0 - s0) / 86_400_000);
        total += d;
        due += d * Math.max(0, Math.min(1, (Date.parse(today) - s0) / (e0 - s0)));
      }
      return total ? Math.round((due / total) * 100) : null;
    };
    const wsStats = ws.map((w: Row) => {
      const t = (acts as Row[]).filter((a) => a.workstream_id === w.id);
      const wm = ms.filter((m: Row) => m.workstream_id === w.id);
      const wr = pRaid.filter((r) => raid.find((x: Row) => (x.ref ?? x.id) === r.id)?.workstream_id === w.id);
      const pct = calcPercentComplete(t as any);
      return {
        name: w.name,
        actual: pct ?? w.pct_complete ?? 0,
        plan: planned(t) ?? w.pct_planned ?? 0,
        health: t.length || wm.length ? calcHealth({ today, startDate: null, tasks: t as any, milestones: wm as any, raid: wr, lastStatusAt: today }).score : w.health_score ?? 0,
      };
    });

    const body = {
      project: { id, name: p.name, code: p.code, portfolio: p.portfolio, phase: p.phase, status: proj?.status ?? "Amber", pm: p.project_manager, sponsor: p.sponsor },
      source: { system: "Supabase", database: "HorizonView", schema: "public", mode: "live" },
      refreshedAt: new Date().toISOString(),
      kpis: {
        healthScore: proj?.healthScore ?? p.health_score ?? 0,
        percentComplete: proj?.percentComplete ?? p.percent_complete ?? 0,
        budget: Number(p.budget) || 0,
        actualsToDate,
        forecastAtCompletion: fin.length ? forecastAtCompletion : Number(p.budget) || 0,
        openSev2Defects: openDefects,
        goLiveBaseline: goLive?.baseline_date ?? p.end_date,
        goLiveForecast: goLive?.forecast_date ?? p.end_date,
      },
      budgetBurn: { months: months.map(monthLabel), byWorkstream, budgetByWorkstream },
      defects: { weeks: weeks.map(weekLabel), byWorkstream: defectsBy },
      workstreams: wsStats,
      milestones: ms.map((m: Row) => ({
        name: m.name, baseline: m.baseline_date, forecast: m.forecast_date, status: m.status,
        workstreams: m.workstream_id ? [wsName.get(m.workstream_id)].filter(Boolean) : names,
      })),
      raid: raid.map((r: Row) => ({
        type: r.raid_type, title: r.title, severity: r.priority, owner: r.owner ?? "", status: r.status,
        workstream: wsName.get(r.workstream_id) ?? "Project",
      })),
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[dashboard] Supabase read failed", e);
    return NextResponse.json({ error: "Could not load dashboard data" }, { status: 502 });
  }
}
