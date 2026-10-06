import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

// Executive Dashboard: fills a client's own PowerPoint template
// (src/assets/templates/executive-dashboard.pptx) with live project data.
// The template keeps the client's design, layout, fonts and branding; every
// data-bearing text run, progress bar, table cell and chart value in it is a
// {{token}} that is replaced here. Nothing is redrawn, so the output is the
// client's deck, just filled in.
//
// The template has three slides: cover, summary (slide 2) and a one-project
// dashboard (slide 3). A single-project deck fills each once. A portfolio deck
// fills the summary with the whole portfolio and repeats slide 3 once per
// project, each copy with its own donut chart.

export type WsStatus = "Completed" | "Active" | "Deferred" | "At Risk";

export interface DashboardWorkstream {
  name: string; // full name, used in tables
  short?: string; // chart category name (keep under ~15 characters)
  label: [string, string]; // two short lines for the status strip
  pct: number;
  lastMonth?: number | null;
  status: WsStatus;
  nextGate?: string;
  target?: string; // e.g. "Oct 30"
  due?: string; // YYYY-MM-DD, orders the near-term gates
  /** Replaces the "65%" shown in the strip and gates table (e.g. "Late"). */
  valueText?: string;
}

/** One project-dashboard slide (template slide 3). */
export interface DetailSlide {
  shortName: string;
  headline: string;
  sub: string;
  pct: number;
  lastMonthPct?: number | null;
  targetPct: number;
  targetLabel: string;
  since: string;
  next: string;
  callout: { label: string; text: string };
  asOf: string;
  /** "workstreams" (default) or "milestones" when the project tracks milestones only. */
  unit?: "workstreams" | "milestones";
  items: DashboardWorkstream[];
}

interface Tile { label: string; value: string; sub: string }

/** The summary slide (template slide 2). */
export interface SummarySlide {
  headline: string;
  dateline: string;
  tiles: [Tile, Tile, Tile, Tile];
  chartTitle: string;
  /** Up to four bars, top to bottom. */
  bars: { name: string; pct: number; lastMonth?: number | null }[];
  priorities: { title: string; text: string }[]; // 3
  nextLabel: string;
  next: string;
}

export interface ExecutiveDashboardInput {
  projectName: string; // "Project Phoenix"
  shortName: string; // "Phoenix"
  portfolio: string;
  asOf: string; // "October 6, 2026"
  pct: number;
  lastMonthPct: number;
  targetPct: number;
  targetLabel: string; // "Oct. 22"
  summaryHeadline: string; // slide 2 headline
  detailHeadline: string; // slide 3 headline
  detailSub: string;
  sinceLastReport: string;
  next: string;
  priorities: { title: string; text: string }[]; // 3
  next60: string;
  callout: { label: string; text: string };
  workstreams: DashboardWorkstream[]; // up to 13, in strip order
}

const STRIP = 13; // the template's status strip has 13 cells
const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const emu = (n: number) => String(Math.max(0, Math.round(n)));
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Shorten to a whole word under n characters. */
export function fit(s: string, n: number): string {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n - 1);
  const sp = cut.lastIndexOf(" ");
  return (sp > n * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:·–-]+$/, "") + "…";
}

/** Split a name over two strip lines of about `per` characters each. */
export function twoLines(name: string, per = 12): [string, string] {
  const words = name.split(/\s+/).filter(Boolean);
  if (name.length <= per || words.length === 1) return [fit(name, per + 2), ""];
  let best: [string, string] = [words[0], words.slice(1).join(" ")];
  let score = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" "), b = words.slice(i).join(" ");
    const s = Math.max(a.length, b.length);
    if (s < score) { score = s; best = [a, b]; }
  }
  return [fit(best[0], per + 2), fit(best[1], per + 2)];
}

// ── Token sets ───────────────────────────────────────────────────────────────

function coverTokens(title: string, sub: string, asOf: string): Record<string, string> {
  return { cover_title: title, cover_sub: sub, cover_date: `Status as of ${asOf}` };
}

function summaryTokens(s: SummarySlide): Record<string, string> {
  const t: Record<string, string> = {};
  t.s2_headline = s.headline;
  t.s2_dateline = s.dateline;
  s.tiles.forEach((tile, i) => {
    t[`t${i + 1}_label`] = tile.label;
    t[`t${i + 1}_value`] = tile.value;
    t[`t${i + 1}_sub`] = tile.sub;
  });
  t.s2_chart_title = s.chartTitle;
  const PER_PCT = 50800; // bar width per 1%, from the template
  const BAR_X = 1905000;
  for (let r = 0; r < 4; r++) {
    const b = s.bars[r];
    const lm = b?.lastMonth;
    t[`r${r}_cur_w`] = emu(b ? clamp(b.pct) * PER_PCT : 0);
    t[`r${r}_lm_w`] = emu(lm != null ? clamp(lm) * PER_PCT : 0);
    t[`r${r}_lm_x`] = emu(BAR_X + (lm != null ? clamp(lm) : 0) * PER_PCT + 63500);
    t[`r${r}_lm`] = lm != null ? String(clamp(lm)) : "";
  }
  // The chart lists categories bottom-up.
  for (let i = 0; i < 4; i++) {
    const b = s.bars[3 - i];
    t[`ch1_cat${i}`] = b ? b.name : "";
    t[`ch1_val${i}`] = b ? String(clamp(b.pct)) : "0";
  }
  for (let i = 0; i < 3; i++) {
    const p = s.priorities[i];
    t[`p${i + 1}_title`] = p ? `${i + 1} · ${p.title}` : "";
    t[`p${i + 1}_text`] = p ? p.text : "";
  }
  t.s2_next_label = s.nextLabel;
  t.s2_next = s.next;
  return t;
}

function detailTokens(d: DetailSlide): Record<string, string> {
  const real = d.items.slice(0, STRIP);
  const ws = [...real];
  while (ws.length < STRIP) ws.push({ name: "", label: ["", ""], pct: 0, status: "Deferred" });
  const count = (s: WsStatus) => real.filter((w) => w.status === s).length;
  const t: Record<string, string> = {};
  const milestones = d.unit === "milestones";
  t.s3_kicker = "PROJECT DASHBOARD";
  t.s3_headline = d.headline;
  t.s3_sub = d.sub;
  t.s3_name = d.shortName;
  t.s3_range = `${clamp(d.pct)}% → ${clamp(d.targetPct)}%`;
  t.s3_range_note = `Current → target by ${d.targetLabel}`;
  t.s3_since = d.since;
  t.s3_next = d.next;
  t.s3_total = String(real.length);
  t.s3_n_completed = String(count("Completed"));
  t.s3_n_active = String(count("Active"));
  t.s3_n_deferred = String(count("Deferred"));
  t.s3_n_atrisk = String(count("At Risk"));
  t.ch2_v0 = t.s3_n_completed;
  t.ch2_v1 = t.s3_n_active;
  t.ch2_v2 = t.s3_n_deferred;
  t.ch2_v3 = t.s3_n_atrisk;
  t.s3_gates_title = milestones ? "Next Milestones" : "Near-Term Gates";
  t.s3_callout_label = d.callout.label.toUpperCase();
  t.s3_callout = d.callout.text;
  t.s3_asof = `Status as of ${d.asOf}`;
  // Progress bar (track x and width from the template)
  const X0 = 628650;
  const W = 3327400;
  const lm = d.lastMonthPct;
  t.s3_bar_cur_w = emu((W * clamp(d.pct)) / 100);
  t.s3_bar_tgt_x = emu(X0 + (W * clamp(d.pct)) / 100);
  t.s3_bar_tgt_w = emu((W * Math.max(0, clamp(d.targetPct) - clamp(d.pct))) / 100);
  t.s3_bar_mark_x = emu(X0 + (W * clamp(d.targetPct)) / 100 - 19050);
  t.s3_bar_lm_w = emu(lm != null ? (W * clamp(lm)) / 100 : 0);
  t.s3_lm_label = lm != null ? `LAST MONTH • ${clamp(lm)}%` : "";
  // Near-term gates: the open items with the soonest targets
  t.g0_0 = milestones ? "MILESTONE" : "WORKSTREAM";
  const gates = real
    .filter((w) => w.status !== "Completed" && w.nextGate)
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"))
    .slice(0, 4);
  for (let r = 0; r < 4; r++) {
    const g = gates[r];
    t[`g${r + 1}_0`] = g ? g.name : "";
    t[`g${r + 1}_1`] = g ? g.valueText ?? `${clamp(g.pct)}%` : "";
    t[`g${r + 1}_2`] = g?.nextGate ?? "";
    t[`g${r + 1}_3`] = g?.target ?? "";
  }
  // Status strip
  ws.forEach((w, k) => {
    const done = w.status === "Completed" || clamp(w.pct) >= 100;
    t[`c${k}_l1`] = w.label[0];
    t[`c${k}_l2`] = w.label[1];
    t[`c${k}_l12`] = w.label.filter(Boolean).join(" ");
    t[`c${k}_val`] = w.name ? w.valueText ?? `${clamp(w.pct)}%` : "";
    t[`c${k}_bg`] = done ? "F3F7FB" : "E8F0F8";
    t[`c${k}_vc`] = w.status === "At Risk" ? "C0392B" : done ? "5F636A" : "2066B5";
  });
  return t;
}

// ── Template handling ────────────────────────────────────────────────────────

let templateCache: Buffer | null = null;
async function template(): Promise<Buffer> {
  if (!templateCache) templateCache = await readFile(path.join(process.cwd(), "src", "assets", "templates", "executive-dashboard.pptx"));
  return templateCache;
}

function fill(xml: string, values: Record<string, string>, part: string): string {
  return xml.replace(/\{\{([a-z0-9_]+)\}\}/g, (_m, key: string) => {
    if (!(key in values)) throw new Error(`Executive dashboard template: no value for {{${key}}} in ${part}`);
    return esc(values[key]);
  });
}

const SHAPE_RE = /<p:(sp|cxnSp|graphicFrame|pic|grpSp)>[\s\S]*?<\/p:\1>/g;

/**
 * Lay the status strip out for `n` cells instead of 13: unused cells are
 * removed and the remaining ones widened to span the same width. Each cell is
 * four shapes in a row: background (carries {{cK_bg}}), accent bar, label, value.
 */
function relayoutStrip(xml: string, n: number): string {
  if (n >= STRIP) return xml;
  const X0 = 457200, X_END = 11734800, GAP = 38100, OLD_W = 832338;
  const w = Math.floor((X_END - X0 - (n - 1) * GAP) / Math.max(n, 1));
  let cell = -1;
  let pending = 0; // shapes left in the current cell after its background
  return xml.replace(SHAPE_RE, (block) => {
    const bg = block.match(/\{\{c(\d+)_bg\}\}/);
    if (bg) { cell = Number(bg[1]); pending = 3; }
    else if (pending > 0) pending--;
    else return block;
    if (cell >= n) return ""; // drop unused cells
    const off = block.match(/<a:off x="(\d+)" y="(\d+)"\/>\s*<a:ext cx="(\d+)" cy="(\d+)"\/>/);
    if (!off) return block;
    const oldCellX = X0 + cell * (OLD_W + GAP);
    const inset = Number(off[1]) - oldCellX; // label boxes sit 38100 in from the cell edge
    const newX = X0 + cell * (w + GAP) + inset;
    const newCx = Math.max(0, w - 2 * inset);
    return block.replace(off[0], `<a:off x="${newX}" y="${off[2]}"/><a:ext cx="${newCx}" cy="${off[4]}"/>`);
  });
}

/** Template static labels that change when a project tracks milestones instead of workstreams. */
function milestoneWording(xml: string): string {
  return xml
    .replace(/<a:t>Workstream Snapshot<\/a:t>/g, "<a:t>Milestone Snapshot</a:t>")
    .replace(/<a:t>workstreams<\/a:t>/g, "<a:t>milestones</a:t>")
    .replace(/<a:t>Workstream Status<\/a:t>/g, "<a:t>Milestone Status</a:t>")
    .replace(/<a:t>PROGRESS<\/a:t>/g, "<a:t>STATUS</a:t>")
    .replace(/<a:t>NEXT GATE<\/a:t>/g, "<a:t>VS. BASELINE</a:t>")
    .replace(/<a:t>TARGET<\/a:t>/g, "<a:t>FORECAST</a:t>");
}

async function render(
  cover: Record<string, string>,
  summary: SummarySlide,
  details: DetailSlide[],
): Promise<Buffer> {
  if (!details.length) throw new Error("Executive dashboard: at least one project slide is required");
  const zip = await JSZip.loadAsync(await template());
  const read = (n: string) => zip.file(n)!.async("string");

  // Cover and summary
  const head = { ...cover, ...summaryTokens(summary) };
  for (const name of ["ppt/slides/slide1.xml", "ppt/slides/slide2.xml", "ppt/charts/chart1.xml", "docProps/core.xml"]) {
    const xml = await read(name);
    if (xml.includes("{{")) zip.file(name, fill(xml, head, name));
  }

  // Project slides: the template's slide 3 (and its donut, chart2) once per project.
  const [slideXml, chartXml, relsXml, ctXml, presXml, presRels] = await Promise.all([
    read("ppt/slides/slide3.xml"),
    read("ppt/charts/chart2.xml"),
    read("ppt/slides/_rels/slide3.xml.rels"),
    read("[Content_Types].xml"),
    read("ppt/presentation.xml"),
    read("ppt/_rels/presentation.xml.rels"),
  ]);
  let ct = ctXml, pres = presXml, prels = presRels;
  const nums = (xml: string, re: RegExp) => (xml.match(re) ?? []).map((s) => Number(s.replace(/\D/g, "")));
  let nextSldId = Math.max(0, ...nums(pres, /<p:sldId id="\d+"/g)) + 1;
  let nextRid = Math.max(0, ...nums(prels, /Id="rId\d+"/g)) + 1;

  details.forEach((d, i) => {
    const values = detailTokens(d);
    let sx = relayoutStrip(slideXml, Math.min(Math.max(d.items.length, 1), STRIP));
    // Snapshot counts were sized for one digit: widen them so "10" stays on one line.
    sx = sx.replace(SHAPE_RE, (b) =>
      /\{\{s3_n_/.test(b)
        ? b.replace(/<a:off x="(\d+)" y="(\d+)"\/>\s*<a:ext cx="(\d+)" cy="(\d+)"\/>/, (_m, x, y, cx, cy) =>
            `<a:off x="${x}" y="${y}"/><a:ext cx="${Number(cx) + 190500}" cy="${cy}"/>`)
        : b);
    if (d.unit === "milestones") sx = milestoneWording(sx);
    const sFilled = fill(sx, values, "slide3");
    const cx = d.unit === "milestones" ? chartXml.replace("<c:v>Workstreams</c:v>", "<c:v>Milestones</c:v>") : chartXml;
    const cFilled = fill(cx, values, "chart2");
    if (i === 0) {
      zip.file("ppt/slides/slide3.xml", sFilled);
      zip.file("ppt/charts/chart2.xml", cFilled);
      return;
    }
    const sNo = 3 + i, cNo = 2 + i;
    zip.file(`ppt/slides/slide${sNo}.xml`, sFilled);
    zip.file(`ppt/charts/chart${cNo}.xml`, cFilled);
    // Copies point at their own chart and carry no speaker-notes part.
    zip.file(
      `ppt/slides/_rels/slide${sNo}.xml.rels`,
      relsXml
        .replace(/<Relationship [^>]*notesSlide[^>]*\/>/g, "")
        .replace("../charts/chart2.xml", `../charts/chart${cNo}.xml`),
    );
    ct = ct.replace(
      "</Types>",
      `<Override PartName="/ppt/slides/slide${sNo}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>` +
        `<Override PartName="/ppt/charts/chart${cNo}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>`,
    );
    const rid = `rId${nextRid++}`;
    prels = prels.replace(
      "</Relationships>",
      `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${sNo}.xml"/></Relationships>`,
    );
    pres = pres.replace("</p:sldIdLst>", `<p:sldId id="${nextSldId++}" r:id="${rid}"/></p:sldIdLst>`);
  });
  zip.file("[Content_Types].xml", ct);
  zip.file("ppt/presentation.xml", pres);
  zip.file("ppt/_rels/presentation.xml.rels", prels);

  const app = zip.file("docProps/app.xml");
  if (app) {
    const x = await app.async("string");
    zip.file("docProps/app.xml", x.replace(/<Slides>\d+<\/Slides>/, `<Slides>${2 + details.length}</Slides>`));
  }
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }) as Promise<Buffer>;
}

// ── Public builders ──────────────────────────────────────────────────────────

/** Single-project Executive Dashboard: cover, workstream summary, project dashboard. */
export async function buildExecutiveDashboard(d: ExecutiveDashboardInput): Promise<Buffer> {
  const real = d.workstreams.slice(0, STRIP);
  const count = (s: WsStatus) => real.filter((w) => w.status === s).length;
  const atRisk = real.filter((w) => w.status === "At Risk");
  // Four bars: at-risk first, then the least-complete active workstreams.
  const rows = [...atRisk, ...real.filter((w) => w.status === "Active").sort((a, b) => a.pct - b.pct)]
    .concat(real.filter((w) => w.status !== "Active" && w.status !== "At Risk"))
    .slice(0, 4);
  const summary: SummarySlide = {
    headline: d.summaryHeadline,
    dateline: `${d.asOf} · ${real.length} workstreams`,
    tiles: [
      { label: "COMPLETE", value: `${clamp(d.pct)}%`, sub: `${clamp(d.lastMonthPct)}% last month` },
      { label: "WORKSTREAMS", value: String(real.length), sub: `${count("Active") + count("At Risk")} active · ${count("Deferred")} deferred` },
      { label: "COMPLETED", value: String(count("Completed")), sub: `${Math.round((count("Completed") / Math.max(1, real.length)) * 100)}% of workstreams` },
      { label: "AT RISK", value: String(atRisk.length), sub: atRisk.length ? atRisk.map((w) => w.name).join(" · ") : "No exceptions" },
    ],
    chartTitle: "Progress",
    bars: rows.map((w) => ({ name: w.short ?? w.name, pct: w.pct, lastMonth: w.lastMonth })),
    priorities: d.priorities,
    nextLabel: "NEXT 60 DAYS",
    next: d.next60,
  };
  return render(
    coverTokens(`${d.projectName} Executive Dashboard`, `${d.portfolio} · progress update`, d.asOf),
    summary,
    [{
      shortName: d.shortName, headline: d.detailHeadline, sub: d.detailSub, pct: d.pct, lastMonthPct: d.lastMonthPct,
      targetPct: d.targetPct, targetLabel: d.targetLabel, since: d.sinceLastReport, next: d.next, callout: d.callout,
      asOf: d.asOf, items: d.workstreams,
    }],
  );
}

/** Portfolio deck in the client template: cover, portfolio summary, one dashboard per project. */
export async function buildPortfolioDashboard(input: {
  title: string;
  subtitle: string;
  asOf: string;
  summary: SummarySlide;
  projects: DetailSlide[];
}): Promise<Buffer> {
  return render(coverTokens(input.title, input.subtitle, input.asOf), input.summary, input.projects);
}
