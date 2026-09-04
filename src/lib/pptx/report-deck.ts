import PptxGenJS from "pptxgenjs";
import {
  FOOT_Y,
  BODY_Y,
  BULLET,
  C,
  F,
  M,
  CW,
  PAGE,
  DOT,
  ROW_H,
  T,
  TITLE_Y,
  cut,
  sentences,
  daysBetween,
  fmtDelta,
  footer,
  headerRow,
  kpiStrip,
  onTeal,
  phaseTrack,
  prose,
  ragLabel,
  ragText,
  ragFill,
  milestoneFill,
  severityText,
  sectionLabel,
  slideHeader,
  tableOpts,
  tint,
  type Rag,
} from "./brand";
import { fmtMoney } from "@/lib/format";
import type { Milestone, PortfolioKpis, Project, RaidItem } from "@/lib/types";

// Builds the Steering Committee deck. Structure follows the client's Internal
// Status Report — a dense one-pager per project, then schedule and RAID tables —
// rendered in the Aberdeen palette so it matches the portal and the website.

// Standard delivery phases; a project's own `phase` string locates it on the track.
const PHASES = ["Design", "Build", "Test", "Deploy", "Hypercare"];

const MILESTONES_PER_PAGE = 13;
const RAID_PER_PAGE = 11;

// Below these counts, activities and RAID share one dense page — the layout the
// client's status report uses. Above them, each gets its own paginated slides.
const COMBINED_MS_MAX = 7;
const COMBINED_RAID_MAX = 7;

export interface DeckInput {
  projects: Project[];
  raid: RaidItem[];
  milestones: Milestone[];
  kpis: PortfolioKpis;
  /** Single-project deck when set. */
  singleProjectId?: string;
  logo?: string; // white HorizonView lockup, for the navy cover
  cover?: string; // Aberdeen "Title_Dark" chevron cover art
  mark?: string; // Aberdeen wordmark, for the content-slide footer
}

const sevRank = { High: 0, Medium: 1, Low: 2 } as const;
const statusRank = { Overdue: 0, "In Progress": 1, Open: 2, Closed: 3 } as const;

/** Page counter — footers need the total, so slides are queued then stamped. */
type Page = { render: (slide: PptxGenJS.Slide, page: number, of: number) => void };

export function buildDeck(input: DeckInput): Promise<Buffer> {
  const { projects, raid, milestones, kpis, singleProjectId, logo, cover, mark } = input;
  const single = singleProjectId ? projects.find((p) => p.id === singleProjectId) : undefined;
  const scope = single ? [single] : projects;
  const asOf = new Date().toISOString().slice(0, 10);
  const stamp = `As of ${asOf} · Internal`;

  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_WIDE"; // must be set before any slide is added
  pres.author = "Aberdeen Advisors";
  pres.company = "Aberdeen Advisors";
  pres.title = single ? `${single.name} — Steering Committee Update` : "Portfolio Steering Committee Update";

  const pages: Page[] = [];

  // ── Cover ──────────────────────────────────────────────────────────────────
  pages.push({
    render: (s) => {
      // The master's Title_Dark treatment: Aberdeen Blue with two translucent
      // teal chevrons. Baked to an image because pptxgenjs cannot express the
      // layout's custGeom path (see scripts note in public/deck-cover.png).
      s.background = { color: C.navy };
      if (cover) s.addImage({ data: cover, x: 0, y: 0, w: PAGE.w, h: PAGE.h });

      if (logo) {
        s.addImage({ data: logo, x: M, y: 0.62, w: 2.1, h: 0.685 });
      } else {
        s.addText("HorizonView", {
          x: M, y: 0.62, w: 4, h: 0.5, fontFace: F.head, fontSize: 26,
          color: C.white, isTextBox: true, margin: 0,
        });
      }
      s.addText("by Aberdeen Advisors", {
        x: M, y: 1.33, w: 4, h: 0.24, fontFace: F.body, fontSize: 11,
        color: "FFFFFF", transparency: 35, isTextBox: true, margin: 0,
      });

      // Title block, near the master's ctrTitle position (y=1.414 x SCALE).
      s.addText("STEERING COMMITTEE UPDATE", {
        x: M, y: 2.16, w: CW, h: 0.3, fontFace: F.head, fontSize: 11, bold: true,
        color: C.teal, charSpacing: 3, isTextBox: true, margin: 0,
      });
      s.addText(single ? single.name : "Portfolio Review", {
        x: M, y: 2.46, w: CW * 0.62, h: 0.81, fontFace: F.head, fontSize: T.title,
        color: C.white, isTextBox: true, margin: 0, valign: "middle", fit: "shrink",
      });
      s.addText(
        single ? `${single.code} · ${single.portfolio}` : `${projects.length} active projects`,
        {
          x: M, y: 3.3, w: CW * 0.62, h: 0.36, fontFace: F.body, fontSize: 14,
          color: C.teal, isTextBox: true, margin: 0, valign: "middle",
        }
      );

      const meta: [string, string][] = single
        ? [
            ["Phase", `${single.phase} · ${single.percentComplete}% complete`],
            ["Sponsor", single.sponsor],
            ["Health score", `${single.healthScore} / 100`],
            ["Project manager", single.projectManager],
            ["Baseline finish", single.endDate],
            ["AI forecast finish", single.forecastCompletionDate],
          ]
        : [
            ["Portfolio", projects[0]?.portfolio ?? "Aberdeen Advisors"],
            ["Active projects", String(kpis.totalProjects)],
            ["Executive health", `${kpis.executiveHealthScore} / 100`],
            ["Total budget", fmtMoney(kpis.totalBudget)],
            ["Open decisions", String(kpis.openDecisions)],
            ["RAG", `${kpis.green}G · ${kpis.amber}A · ${kpis.red}R`],
          ];

      const colW = (CW * 0.62) / 3;
      meta.forEach(([label, value], i) => {
        const mx = M + (i % 3) * colW;
        const my = 4.42 + Math.floor(i / 3) * 0.8;
        s.addText(label.toUpperCase(), {
          x: mx, y: my, w: colW - 0.2, h: 0.22, fontFace: F.head, fontSize: 8, bold: true,
          color: C.teal, charSpacing: 1.1, isTextBox: true, margin: 0,
        });
        s.addText(value, {
          x: mx, y: my + 0.21, w: colW - 0.2, h: 0.32, fontFace: F.body, fontSize: 13,
          color: C.white, isTextBox: true, margin: 0, fit: "shrink",
        });
      });

      // Status chip, top-right. Square-cornered per the master's shape
      // vocabulary, and sat on TITLE_Y so it lines up with the title band on
      // every following slide. Amber and Jade fills take Aberdeen Blue text —
      // white on those is non-compliant in the style guide.
      if (single) {
        const rag = single.status as Rag;
        const chipW = 1.8;
        const chipH = 0.44;
        const chipX = PAGE.w - M - chipW;
        s.addShape("rect", {
          x: chipX, y: TITLE_Y, w: chipW, h: chipH,
          fill: { color: ragFill[rag] }, line: { type: "none" },
        });
        s.addText(ragLabel[rag], {
          x: chipX, y: TITLE_Y, w: chipW, h: chipH, fontFace: F.head, fontSize: 12,
          bold: true, color: rag === "Red" ? C.white : onTeal,
          align: "center", isTextBox: true, margin: 0, valign: "middle",
        });
      }

      // Aberdeen wordmark bottom-left, matching the master's footer band.
      s.addText(
        `${stamp}  ·  Certified KPIs from the Power BI Semantic Model  ·  AI insights generated in Microsoft Fabric`,
        {
          x: M, y: 6.9, w: CW, h: 0.26, fontFace: F.body, fontSize: 9.3,
          color: "FFFFFF", transparency: 45, isTextBox: true, margin: 0,
        }
      );
    },
  });

  // ── Portfolio pages (portfolio deck only) ─────────────────────────────────
  if (!single) {
    // The roll-up shares the health page unless there are too many projects to
    // fit above the footer, in which case it gets a slide of its own.
    const rollUpInline = projects.length <= 6;

    pages.push({
      render: (s, page, of) => {
        slideHeader(s, "Portfolio Health", stamp);
        let y = sectionLabel(s, "Certified portfolio metrics", M, BODY_Y, CW);
        kpiStrip(
          s,
          [
            { label: "Executive health", value: `${kpis.executiveHealthScore}`, sub: "score / 100",
              color: kpis.executiveHealthScore >= 75 ? C.jade : kpis.executiveHealthScore >= 55 ? C.goldInk : C.jasperInk },
            { label: "Active projects", value: String(kpis.totalProjects), sub: `${kpis.green}G · ${kpis.amber}A · ${kpis.red}R` },
            { label: "Total budget", value: fmtMoney(kpis.totalBudget), sub: `${fmtMoney(kpis.totalActuals)} actuals` },
            { label: "Budget variance", value: `${kpis.budgetVariancePct >= 0 ? "+" : ""}${kpis.budgetVariancePct.toFixed(1)}%`, sub: "forecast at completion",
              color: kpis.budgetVariancePct > 5 ? C.jasperInk : kpis.budgetVariancePct > 0 ? C.goldInk : C.jade },
            { label: "Milestones", value: `${kpis.milestoneCompletionPct.toFixed(0)}%`, sub: "baseline complete" },
            { label: "Open decisions", value: String(kpis.openDecisions), sub: `${kpis.openRaidCount} open RAID` },
          ],
          M,
          y,
          CW,
          0.86
        );
        y += 0.96;

        // The RAG split lives in the "Active projects" tile and again as a status
        // dot per row in the roll-up, so no separate bar is needed here.
        y = sectionLabel(s, "AI executive summary — this week", M, y, CW);
        // Capped at three lines so the roll-up below always clears the footer.
        y += prose(s, kpis.portfolioSummary, M, y, CW, T.prose, 0.78) + 0.16;

        if (rollUpInline) {
          y = sectionLabel(s, "Project roll-up", M, y, CW);
          const h = rollUpTable(s, projects, y);
          s.addText(
            "Variance and forecast finish are ML-derived in Microsoft Fabric; red indicates a forecast beyond the approved baseline.",
            { x: M, y: y + h + 0.1, w: CW, h: 0.22, fontFace: F.body, fontSize: T.foot, color: C.subtle, isTextBox: true, margin: 0 }
          );
        } else {
          s.addText(
            "Generated in Microsoft Fabric Notebooks · grounded in the HorizonView Intelligence Layer",
            { x: M, y, w: CW, h: 0.22, fontFace: F.body, fontSize: T.foot, color: C.subtle, isTextBox: true, margin: 0 }
          );
        }
        footer(s, "Portfolio Steering Committee Update", page, of, mark);
      },
    });

    // Project roll-up on its own slide only when it will not fit above.
    if (!rollUpInline) {
      pages.push({
        render: (s, page, of) => {
          slideHeader(s, "Project Roll-Up", stamp);
          const h = rollUpTable(s, projects, BODY_Y);
          s.addText(
            "Variance and forecast finish are ML-derived in Microsoft Fabric; red indicates a forecast beyond the approved baseline.",
            { x: M, y: BODY_Y + h + 0.15, w: CW, h: 0.22, fontFace: F.body, fontSize: T.foot, color: C.subtle, isTextBox: true, margin: 0 }
          );
          footer(s, "Portfolio Steering Committee Update", page, of, mark);
        },
      });
    }
  }

  // ── Per-project pages ─────────────────────────────────────────────────────
  for (const p of scope) {
    const pRaid = raid
      .filter((r) => r.projectId === p.id && r.status !== "Closed")
      .sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || statusRank[a.status] - statusRank[b.status]);
    const pMs = milestones.filter((m) => m.projectId === p.id);
    const footLeft = `HorizonView · ${p.name} · ${p.code}`;

    // Executive status one-pager
    pages.push({
      render: (s, page, of) => {
        slideHeader(s, `${p.name} — Executive Status`, stamp);

        // Ownership strip (the reference's "Leads: / PMs:" header row)
        s.addText(
          [
            { text: "Sponsor: ", options: { bold: true, color: C.navy } },
            { text: p.sponsor, options: { color: C.onyx } },
            { text: "     Project manager: ", options: { bold: true, color: C.navy } },
            { text: p.projectManager, options: { color: C.onyx } },
            { text: "     Portfolio: ", options: { bold: true, color: C.navy } },
            { text: p.portfolio, options: { color: C.onyx } },
            { text: "     Window: ", options: { bold: true, color: C.navy } },
            { text: `${p.startDate} → ${p.endDate}`, options: { color: C.onyx } },
          ],
          { x: M, y: 0.99, w: CW, h: 0.26, fontFace: F.body, fontSize: 11, isTextBox: true, margin: 0, valign: "middle" }
        );

        let y = sectionLabel(s, "Executive summary", M, 1.31, CW, {
          text: `Current status: ${ragLabel[p.status as Rag]}`,
          color: ragText[p.status as Rag],
        });
        y += prose(s, p.executiveSummary, M, y, CW, T.prose, 0.92) + 0.16;

        // Metric strip
        const variance = p.forecastAtCompletion - p.budget;
        const slip = daysBetween(p.endDate, p.forecastCompletionDate);
        kpiStrip(
          s,
          [
            { label: "Health score", value: String(p.healthScore), sub: "0–100",
              color: p.healthScore >= 75 ? C.jade : p.healthScore >= 50 ? C.goldInk : C.jasperInk },
            { label: "Complete", value: `${p.percentComplete}%`, sub: p.phase },
            { label: "Budget", value: p.budget > 0 ? fmtMoney(p.budget) : "N/A", sub: p.budget > 0 ? `${fmtMoney(p.actualsToDate)} actuals` : "not tracked" },
            { label: "Forecast (FAC)", value: p.budget > 0 ? fmtMoney(p.forecastAtCompletion) : "N/A",
              sub: p.budget > 0 ? `${fmtDelta(variance, fmtMoney)} vs budget` : "not tracked",
              color: variance > 0 ? C.jasperInk : C.jade },
            { label: "Schedule risk", value: String(p.scheduleRiskScore), sub: "lower is better",
              color: p.scheduleRiskScore >= 70 ? C.jasperInk : p.scheduleRiskScore >= 40 ? C.goldInk : C.jade },
            { label: "AI forecast finish", value: p.forecastCompletionDate,
              sub: slip > 0 ? `${slip} days past baseline` : "on or ahead of baseline",
              color: slip > 0 ? C.jasperInk : C.jade },
          ],
          M,
          y,
          CW,
          0.86
        );
        y += 0.98;

        // Phase gates
        const idx = Math.max(0, PHASES.indexOf(p.phase));
        y = sectionLabel(s, "Phase gates", M, y, CW);
        phaseTrack(s, PHASES, idx, M, y, CW);
        y += 0.5;

        // Accomplishments | Objectives, side by side (reference layout)
        const colW = (CW - 0.35) / 2;
        const acc = sentences(p.weeklyChangeSummary, 4);
        const obj = p.recommendedActions.slice(0, 4);
        const yL = sectionLabel(s, "Accomplishments this week", M, y, colW);
        sectionLabel(s, "Objectives / recommended actions", M + colW + 0.35, y, colW);
        const bulletH = 1.24;
        const bullet = (items: string[], x: number) =>
          s.addText(
            (items.length ? items : ["—"]).map((t, i) => ({
              text: cut(t, 150),
              options: { bullet: BULLET, breakLine: i < items.length - 1, paraSpaceAfter: 6 },
            })),
            { x, y: yL, w: colW, h: bulletH, fontFace: F.body, fontSize: T.bullet, color: C.onyx,
              lineSpacingMultiple: 1.08, isTextBox: true, margin: 0, valign: "top", fit: "shrink" }
          );
        bullet(acc, M);
        bullet(obj, M + colW + 0.35);

        // Decision callout, anchored under the columns so no gap opens up.
        // Pale-teal tint per the master's "kicker" band, Aberdeen Blue text.
        if (p.decisionNeeded) {
          const dy = yL + bulletH + 0.16;
          s.addShape("rect", {
            x: M, y: dy, w: CW, h: 0.55,
            fill: { color: C.tealTint }, line: { color: C.teal, width: 1 },
          });
          s.addText(
            [
              { text: "DECISION NEEDED   ", options: { bold: true, color: C.navy, fontFace: F.head, fontSize: 10, charSpacing: 1.2 } },
              { text: cut(p.decisionNeeded, 210), options: { color: C.onyx, fontFace: F.body, fontSize: T.bullet } },
            ],
            { x: M + 0.16, y: dy, w: CW - 0.32, h: 0.55, isTextBox: true, margin: 0, valign: "middle", fit: "shrink" }
          );
        }
        footer(s, footLeft, page, of, mark);
      },
    });

    // ── Delivery detail ──────────────────────────────────────────────────
    // Short lists share one dense page, as the client's status report does.
    // Long ones get their own paginated slides so nothing is truncated.
    const combined = pMs.length <= COMBINED_MS_MAX && pRaid.length <= COMBINED_RAID_MAX;

    if (combined) {
      pages.push({
        render: (s, page, of) => {
          slideHeader(s, `${p.name} — Delivery Detail`, stamp);
          let y = sectionLabel(s, "Key activities & deliverables", M, BODY_Y, CW);
          y += msTable(s, pMs, y) + 0.24;
          y = sectionLabel(s, "RAID items", M, y, CW);
          y += raidTable(s, pRaid, y) + 0.24;
          // Narrative only when it can sit clear of the footer at a readable size.
          if (y < 6.2) {
            const yy = sectionLabel(s, "Risk narrative", M, y, CW);
            prose(s, p.riskNarrative, M, yy, CW, T.prose, FOOT_Y - 0.22 - yy);
          }
          footer(s, footLeft, page, of, mark);
        },
      });
    } else {
      const msPages = paginate(pMs, MILESTONES_PER_PAGE);
      msPages.forEach((chunk, ci) => {
        pages.push({
          render: (s, page, of) => {
            slideHeader(
              s,
              `${p.name} — Key Activities & Deliverables${msPages.length > 1 ? ` (${ci + 1}/${msPages.length})` : ""}`,
              stamp
            );
            const h = msTable(s, chunk, BODY_Y);
            s.addText("Slip is forecast minus baseline in days; forecasts are ML-derived nightly in Microsoft Fabric.", {
              x: M, y: BODY_Y + h + 0.15, w: CW, h: 0.22, fontFace: F.body, fontSize: T.foot,
              color: C.subtle, isTextBox: true, margin: 0,
            });
            footer(s, footLeft, page, of, mark);
          },
        });
      });

      const raidPages = paginate(pRaid, RAID_PER_PAGE);
      raidPages.forEach((chunk, ci) => {
        pages.push({
          render: (s, page, of) => {
            slideHeader(s, `${p.name} — RAID Log${raidPages.length > 1 ? ` (${ci + 1}/${raidPages.length})` : ""}`, stamp);
            const h = raidTable(s, chunk, BODY_Y);
            const y = BODY_Y + h + 0.25;
            if (ci === raidPages.length - 1 && y < 6.2) {
              const yy = sectionLabel(s, "Risk narrative", M, y, CW);
              prose(s, p.riskNarrative, M, yy, CW, T.prose, FOOT_Y - 0.22 - yy);
            }
            footer(s, footLeft, page, of, mark);
          },
        });
      });
    }
  }

  // ── Decisions required (portfolio deck) ───────────────────────────────────
  if (!single) {
    const decisions = raid
      .filter((r) => r.type === "Decision" && r.status !== "Closed")
      .sort((a, b) => statusRank[a.status] - statusRank[b.status] || a.dueDate.localeCompare(b.dueDate));
    if (decisions.length) {
      paginate(decisions, RAID_PER_PAGE).forEach((chunk, ci, all) => {
        pages.push({
          render: (s, page, of) => {
            slideHeader(s, `Decisions Required${all.length > 1 ? ` (${ci + 1}/${all.length})` : ""}`, stamp);
            const rows: PptxGenJS.TableRow[] = [
              headerRow(["ID", "Decision", "Project", "Owner", "Due date", "Severity", "Status"], [0, 4, 5, 6]),
            ];
            chunk.forEach((d) => {
              const overdue = d.status === "Overdue";
              rows.push([
                { text: d.id.toUpperCase(), options: { ...tint, align: "center", color: C.navy, bold: true } },
                { text: d.title },
                { text: projects.find((p) => p.id === d.projectId)?.name ?? "—", options: { color: C.navy } },
                { text: d.owner },
                { text: d.dueDate, options: { align: "center", bold: overdue, color: overdue ? C.jasperInk : C.onyx } },
                { text: d.severity, options: { align: "center", color: severityText[d.severity] ?? C.onyx } },
                {
                  text: `${DOT}  ${d.status}`,
                  options: { align: "center", bold: overdue, color: overdue ? C.jasperInk : C.grey },
                },
              ]);
            });
            s.addTable(rows, { ...tableOpts([0.85, 4.95, 1.6, 1.3, 1.15, 1.05, 1.63]), y: BODY_Y });
            s.addText(
              `${decisions.filter((d) => d.status === "Overdue").length} of ${decisions.length} open decisions are past their due date.`,
              { x: M, y: BODY_Y + ROW_H.body * rows.length + 0.15, w: CW, h: 0.22, fontFace: F.body, fontSize: T.foot, color: C.subtle, isTextBox: true, margin: 0 }
            );
            footer(s, "Portfolio Steering Committee Update", page, of, mark);
          },
        });
      });
    }
  }

  // Stamp footers now that the total is known (cover carries no page number).
  const of = pages.length;
  pages.forEach((p, i) => p.render(pres.addSlide(), i + 1, of));

  return pres.write({ outputType: "nodebuffer" }) as Promise<Buffer>;
}

function paginate<T>(arr: T[], per: number): T[][] {
  if (!arr.length) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += per) out.push(arr.slice(i, i + per));
  return out;
}

/**
 * Cross-project roll-up. Ten columns, so it runs at T.tableWide with the
 * label column tinted pale teal the way the master's sample tables do.
 */
function rollUpTable(s: PptxGenJS.Slide, projects: Project[], y: number): number {
  const rows: PptxGenJS.TableRow[] = [
    headerRow(
      ["Project", "Code", "Phase", "Status", "Health", "Complete", "Budget", "Forecast", "Variance", "Forecast finish"],
      [3, 4, 5, 9]
    ),
  ];
  projects.forEach((p) => {
    const variance = p.forecastAtCompletion - p.budget;
    rows.push([
      { text: p.name, options: { ...tint, bold: true, color: C.navy } },
      { text: p.code, options: { ...tint, color: C.navy } },
      { text: p.phase, options: { color: C.navy } },
      {
        text: `${DOT}  ${ragLabel[p.status as Rag]}`,
        options: { align: "center", color: ragText[p.status as Rag], bold: true },
      },
      { text: String(p.healthScore), options: { align: "center" } },
      { text: `${p.percentComplete}%`, options: { align: "center" } },
      { text: p.budget > 0 ? fmtMoney(p.budget) : "—", options: { align: "right" } },
      { text: p.budget > 0 ? fmtMoney(p.forecastAtCompletion) : "—", options: { align: "right" } },
      {
        text: p.budget > 0 ? fmtDelta(variance, fmtMoney) : "—",
        options: { align: "right", color: variance > 0 ? C.jasperInk : C.jadeInk, bold: variance > 0 },
      },
      {
        text: p.forecastCompletionDate,
        options: { align: "center", color: p.forecastCompletionDate > p.endDate ? C.jasperInk : C.onyx },
      },
    ]);
  });
  s.addTable(rows, {
    ...tableOpts([2.45, 0.85, 0.9, 1.2, 0.72, 1.0, 0.98, 1.05, 1.05, 1.35], ROW_H.wide, T.tableWide),
    y,
  });
  return rows.length * ROW_H.wide;
}

/** Milestones / deliverables table. Returns its rendered height. */
function msTable(s: PptxGenJS.Slide, items: Milestone[], y: number): number {
  const rows: PptxGenJS.TableRow[] = [
    headerRow(["Milestone / deliverable", "RAG", "Status", "Baseline date", "Forecast date", "Slip (days)"], [1, 2, 3, 4, 5]),
  ];
  if (!items.length) {
    rows.push([
      { text: "No milestones recorded for this project.", options: { colspan: 6, align: "center", color: C.subtle } },
    ]);
  }
  items.forEach((m) => {
    const slip = daysBetween(m.baselineDate, m.forecastDate);
    rows.push([
      { text: m.name, options: { ...tint, color: C.navy } },
      { text: DOT, options: { align: "center", color: milestoneFill[m.status] ?? C.subtle, fontSize: 14 } },
      {
        text: m.status,
        options: {
          align: "center",
          bold: m.status === "Late",
          color: m.status === "Late" ? C.jasperInk : m.status === "At Risk" ? C.goldInk : C.onyx,
        },
      },
      { text: m.baselineDate, options: { align: "center" } },
      { text: m.forecastDate, options: { align: "center" } },
      {
        text: slip === 0 ? "—" : `${slip > 0 ? "+" : ""}${slip}`,
        options: { align: "center", bold: slip > 0, color: slip > 0 ? C.jasperInk : slip < 0 ? C.jade : C.subtle },
      },
    ]);
  });
  s.addTable(rows, { ...tableOpts([5.45, 0.72, 1.35, 1.6, 1.6, 1.82], ROW_H.body), y });
  return rows.length * ROW_H.body;
}

/** RAID table. Returns its rendered height. */
function raidTable(s: PptxGenJS.Slide, items: RaidItem[], y: number): number {
  const rows: PptxGenJS.TableRow[] = [
    headerRow(["ID", "Type", "Item", "Severity", "Owner", "Due date", "Status"], [0, 3, 5, 6]),
  ];
  if (!items.length) {
    rows.push([
      { text: "No open RAID items for this project.", options: { colspan: 7, align: "center", color: C.subtle } },
    ]);
  }
  items.forEach((r) => {
    const overdue = r.status === "Overdue";
    rows.push([
      { text: r.id.toUpperCase(), options: { ...tint, align: "center", bold: true, color: C.navy } },
      { text: r.type, options: { bold: true, color: C.navy } },
      { text: r.title },
      {
        text: r.severity,
        options: { align: "center", bold: r.severity === "High", color: severityText[r.severity] ?? C.onyx },
      },
      { text: r.owner },
      { text: r.dueDate, options: { align: "center", color: overdue ? C.jasperInk : C.onyx, bold: overdue } },
      {
        text: `${DOT}  ${r.status}`,
        options: {
          align: "center",
          bold: overdue,
          color: overdue ? C.jasperInk : r.status === "In Progress" ? C.azureInk : C.grey,
        },
      },
    ]);
  });
  s.addTable(rows, { ...tableOpts([0.82, 1.18, 4.95, 1.05, 1.3, 1.15, 2.09], ROW_H.body), y });
  return rows.length * ROW_H.body;
}
