import type PptxGenJS from "pptxgenjs";

// ── Aberdeen Advisors deck design system ─────────────────────────────────────
// Derived from "Aberdeen Slide Master.pptx" (Style Guide slide 2 + slideMaster1
// + slideLayout15). The master is authored on a 10" x 5.63" canvas; this deck is
// 13.333" x 7.5", so structural geometry and display type are scaled by
// SCALE = 13.333/10. Table type keeps the master's literal point sizes, because
// these are 7-10 column operational tables rather than the master's 3-column
// samples — see T below.
//
// Layout language for the report itself (dense one-pagers, RAG dots, side-by-side
// Accomplishments/Objectives) comes from the client's Internal Status Report.

/** Master canvas → report canvas. */
export const SCALE = 13.3333 / 10;

// ── Palette (Style Guide, slide 2) ───────────────────────────────────────────
export const C = {
  // Primary
  navy: "09375F", // Aberdeen Blue
  teal: "44B0B1", // Aberdeen Teal
  onyx: "404040", // Onyx — body text
  white: "FFFFFF",
  // Secondary
  deepSky: "5CC8FF",
  jade: "00A676",
  jasper: "DB504A",
  gold: "F7D002",
  // Derived tints used by the master's own slides
  tealTint: "D9F0F0", // ~20% teal — table label columns, callouts
  navyTint: "E8EEF4",
  rule: "B3B3B3", // ~30% Onyx — table grid
  line: "DDE7ED", // soft card border (carried over from the web product)
  mist: "F4F8FA",
  grey: "6B7A85",
  subtle: "97A5AE",
  // Text-safe variants. The style guide bans Aberdeen Teal on white and white on
  // Aberdeen Teal, so anything small on white uses these darkened forms.
  jadeInk: "00694E",
  goldInk: "8A6D00",
  jasperInk: "B3312B",
  azureInk: "025C8C",
} as const;

/**
 * ADA pairings the style guide permits:
 *   white or Aberdeen Teal on Aberdeen Blue
 *   Aberdeen Blue or black on Aberdeen Teal
 *   Aberdeen Blue, Onyx or black on white
 * Never white on teal, never teal on white.
 */
export const onTeal = C.navy;
export const onNavy = C.white;

// Poppins is both major and minor font in the master theme, and the master's
// bodyStyle names it explicitly — so it carries the tables too, not just titles.
export const F = { head: "Poppins", body: "Poppins" } as const;

// ── Type scale ───────────────────────────────────────────────────────────────
// Display sizes are the master's, scaled. Table sizes are the master's literal
// values (11pt), which land correctly for dense multi-column tables on the
// larger canvas; scaling those to 14.7pt would force wrapping in every column.
export const T = {
  title: 32, // master titleStyle 24pt x SCALE
  stamp: 12, // "As of …" meta line on the title row
  section: 12, // in-slide bold navy header, uppercase + tracked
  prose: 16, // long-form narrative
  bullet: 14, // master bodyStyle lvl1
  tableHead: 11, // master literal, bold
  tableBody: 10.5,
  tableWide: 9.5, // 10-column roll-up
  kpiLabel: 8,
  kpiValue: 20,
  kpiSub: 9.5,
  foot: 9.3, // master slide-number 7pt x SCALE
  lane: 7.5,
} as const;

// ── Geometry (master values x SCALE) ─────────────────────────────────────────
export const PAGE = { w: 13.3333, h: 7.5 } as const;
export const M = 0.393; // master 0.295"
export const CW = PAGE.w - M * 2;
export const RULE_Y = 0.252; // teal rule, master y=0.189
export const TITLE_Y = 0.42; // master y=0.315
export const TITLE_H = 0.555; // master h=0.416
export const BODY_Y = 1.15; // content top (master 1.271 assumes a subtitle row)
export const FOOT_Y = 7.1; // master logo/slide-number band y=5.325
export const LOGO_W = 0.968; // master w=0.726
export const LOGO_H = 0.219; // master h=0.164

// Table row heights, close to the master's literal 0.37" body row. Scaling that
// to 0.49" is generous for 3 columns but leaves no room for 11-row RAID logs.
export const ROW_H = { head: 0.38, body: 0.38, wide: 0.34 } as const;

export type Rag = "Green" | "Amber" | "Red";

export const ragFill: Record<Rag, string> = { Green: C.jade, Amber: C.gold, Red: C.jasper };
export const ragText: Record<Rag, string> = { Green: C.jadeInk, Amber: C.goldInk, Red: C.jasperInk };
export const ragLabel: Record<Rag, string> = { Green: "On Track", Amber: "At Risk", Red: "Off Track" };

export const milestoneFill: Record<string, string> = {
  Complete: C.jade,
  "On Track": C.deepSky,
  "At Risk": C.gold,
  Late: C.jasper,
};

export const severityText: Record<string, string> = {
  High: C.jasperInk,
  Medium: C.goldInk,
  Low: C.grey,
};

export const DOT = "●";

/** Truncate on a word boundary so tables never show a mid-word ellipsis. */
export function cut(s: string, n: number): string {
  if (!s) return "";
  if (s.length <= n) return s;
  const slice = s.slice(0, n - 1);
  const sp = slice.lastIndexOf(" ");
  return (sp > n * 0.6 ? slice.slice(0, sp) : slice).trimEnd() + "…";
}

/**
 * Split a prose blob into clean bullets. Portal summaries join clauses with
 * semicolons, so those become separate bullets; trailing punctuation is dropped
 * and the first letter capitalised so each bullet reads as its own statement.
 */
export function sentences(s: string, max = 4): string[] {
  if (!s) return [];
  return s
    .split(/(?<=[.;])\s+/)
    .map((x) => x.trim().replace(/[;,.]+$/, "").trim())
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .slice(0, max);
}

/** Master bodyStyle lvl1 indents (marL 22.8pt, hanging -13.4pt), scaled. */
export const BULLET = { code: "2022", indent: 18 } as const;

/**
 * Signed currency delta. fmtMoney puts the sign inside the amount ("$-50K"),
 * which reads wrong in a variance column, so the sign is hoisted out front.
 */
export function fmtDelta(n: number, fmt: (v: number) => string): string {
  if (n === 0) return "—";
  return `${n > 0 ? "+" : "−"}${fmt(Math.abs(n))}`;
}

/** Whole days between two ISO dates (b - a). Returns 0 on unparseable input. */
export function daysBetween(a: string, b: string): number {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
  return Math.round((tb - ta) / 86_400_000);
}

// ── Slide chrome ─────────────────────────────────────────────────────────────

/**
 * The master's content-slide chrome: a 2pt Aberdeen Teal rule across the top,
 * the title in 32pt regular Aberdeen Blue, and an optional right-aligned stamp.
 * Titles are NOT bold — the master's titleStyle is explicitly b="0".
 */
export function slideHeader(slide: PptxGenJS.Slide, title: string, right?: string) {
  slide.addShape("rect", {
    x: M,
    y: RULE_Y,
    w: CW,
    h: 2 / 72, // master ln w=25400 EMU = 2pt
    fill: { color: C.teal },
    line: { type: "none" },
  });
  slide.addText(title, {
    x: M,
    y: TITLE_Y,
    w: CW * (right ? 0.7 : 1),
    h: TITLE_H,
    fontFace: F.head,
    fontSize: T.title,
    bold: false,
    color: C.navy,
    isTextBox: true,
    margin: 0,
    valign: "middle",
    fit: "shrink",
  });
  if (right) {
    slide.addText(right, {
      x: M + CW * 0.7,
      y: TITLE_Y,
      w: CW * 0.3,
      h: TITLE_H,
      fontFace: F.body,
      fontSize: T.stamp,
      color: C.grey,
      align: "right",
      isTextBox: true,
      margin: 0,
      valign: "middle",
    });
  }
}

/**
 * Section label over a hairline rule. Returns the y below the rule.
 * Bold Aberdeen Blue, uppercase and tracked — the master's in-slide header voice.
 */
export function sectionLabel(
  slide: PptxGenJS.Slide,
  label: string,
  x: number,
  y: number,
  w: number,
  right?: { text: string; color: string }
): number {
  slide.addText(label.toUpperCase(), {
    x,
    y,
    w: right ? w * 0.6 : w,
    h: 0.26,
    fontFace: F.head,
    fontSize: T.section,
    bold: true,
    color: C.navy,
    charSpacing: 1.2,
    isTextBox: true,
    margin: 0,
    valign: "middle",
  });
  if (right) {
    slide.addText(right.text, {
      x: x + w * 0.6,
      y,
      w: w * 0.4,
      h: 0.26,
      fontFace: F.head,
      fontSize: T.section,
      bold: true,
      color: right.color,
      align: "right",
      isTextBox: true,
      margin: 0,
      valign: "middle",
    });
  }
  slide.addShape("rect", {
    x,
    y: y + 0.28,
    w,
    h: 0.014,
    fill: { color: C.navy },
    line: { type: "none" },
  });
  return y + 0.38;
}

/**
 * The master's footer: Aberdeen wordmark bottom-left, slide number bottom-right.
 * `logo` is a data URI; without it the wordmark falls back to text.
 */
export function footer(
  slide: PptxGenJS.Slide,
  left: string,
  page: number,
  of: number,
  logo?: string
) {
  if (logo) {
    slide.addImage({ data: logo, x: M, y: FOOT_Y, w: LOGO_W, h: LOGO_H });
  } else {
    slide.addText("Aberdeen Advisors", {
      x: M,
      y: FOOT_Y,
      w: 2,
      h: LOGO_H,
      fontFace: F.head,
      fontSize: T.foot,
      bold: true,
      color: C.navy,
      isTextBox: true,
      margin: 0,
      valign: "middle",
    });
  }
  slide.addText(left, {
    x: M + LOGO_W + 0.25,
    y: FOOT_Y,
    w: CW - LOGO_W - 2.0,
    h: LOGO_H,
    fontFace: F.body,
    fontSize: T.foot,
    color: C.subtle,
    isTextBox: true,
    margin: 0,
    valign: "middle",
  });
  slide.addText(`${page} / ${of}`, {
    x: M + CW - 1.5,
    y: FOOT_Y,
    w: 1.5,
    h: LOGO_H,
    fontFace: F.body,
    fontSize: T.foot,
    color: C.subtle,
    align: "right",
    isTextBox: true,
    margin: 0,
    valign: "middle",
  });
}

// Average glyph advance for Poppins, in em. Used to size prose blocks up front:
// PowerPoint's own autofit ("fit: shrink") is only recomputed when a shape is
// edited, so a box that is too small ships with its text clipped.
const CHAR_EM = 0.55;
const LINE_H = 1.16;

/** Height a prose block needs at `size`, given a column width. */
export function proseHeight(text: string, w: number, size: number): number {
  const perLine = Math.max(20, Math.floor(w / ((CHAR_EM * size) / 72)));
  const lines = Math.max(1, Math.ceil(text.length / perLine));
  return (lines * size * LINE_H) / 72;
}

/**
 * Body prose, sized to its content so it can never clip. Returns the height
 * consumed, so callers advance their own cursor by it.
 */
export function prose(
  slide: PptxGenJS.Slide,
  text: string,
  x: number,
  y: number,
  w: number,
  size: number = T.prose,
  maxH = Infinity
): number {
  let s = size;
  let h = proseHeight(text, w, s);
  // Step down a point at a time before ever truncating.
  while (h > maxH && s > 9) {
    s -= 1;
    h = proseHeight(text, w, s);
  }
  h = Math.min(h, maxH);
  slide.addText(text, {
    x,
    y,
    w,
    h,
    fontFace: F.body,
    fontSize: s,
    color: C.onyx,
    lineSpacingMultiple: LINE_H,
    isTextBox: true,
    margin: 0,
    valign: "top",
  });
  return h;
}

/** A row of metric tiles. Pale-teal tinted, as the master tints label cells. */
export function kpiStrip(
  slide: PptxGenJS.Slide,
  tiles: { label: string; value: string; sub?: string; color?: string }[],
  x: number,
  y: number,
  w: number,
  h = 0.86
) {
  const gap = 0.1;
  const tw = (w - gap * (tiles.length - 1)) / tiles.length;
  tiles.forEach((t, i) => {
    const tx = x + i * (tw + gap);
    slide.addShape("rect", {
      x: tx,
      y,
      w: tw,
      h,
      fill: { color: C.tealTint },
      line: { color: C.rule, width: 0.75 },
    });
    slide.addText(t.label.toUpperCase(), {
      x: tx + 0.11,
      y: y + 0.07,
      w: tw - 0.22,
      h: 0.19,
      fontFace: F.head,
      fontSize: T.kpiLabel,
      bold: true,
      color: C.navy,
      charSpacing: 0.7,
      isTextBox: true,
      margin: 0,
      valign: "middle",
    });
    slide.addText(t.value, {
      x: tx + 0.11,
      y: y + 0.25,
      w: tw - 0.22,
      h: 0.36,
      fontFace: F.head,
      fontSize: T.kpiValue,
      bold: true,
      color: t.color ?? C.navy,
      isTextBox: true,
      margin: 0,
      valign: "middle",
      fit: "shrink",
    });
    if (t.sub) {
      slide.addText(t.sub, {
        x: tx + 0.11,
        y: y + 0.61,
        w: tw - 0.22,
        h: 0.2,
        fontFace: F.body,
        fontSize: T.kpiSub,
        color: C.onyx,
        isTextBox: true,
        margin: 0,
        valign: "middle",
      });
    }
  });
}

/**
 * Phase gate track. Square-cornered boxes, per the master's shape vocabulary.
 * The active chip is Aberdeen Teal with Aberdeen Blue text — white on teal is
 * explicitly non-compliant in the style guide.
 */
export function phaseTrack(
  slide: PptxGenJS.Slide,
  phases: string[],
  currentIndex: number,
  x: number,
  y: number,
  w: number
) {
  const link = 0.28;
  const cw = (w - link * (phases.length - 1)) / phases.length;
  phases.forEach((p, i) => {
    const px = x + i * (cw + link);
    const done = i < currentIndex;
    const active = i === currentIndex;
    slide.addShape("rect", {
      x: px,
      y,
      w: cw,
      h: 0.34,
      fill: { color: done ? C.navy : active ? C.teal : C.tealTint },
      line: active ? { color: C.navy, width: 1 } : { type: "none" },
    });
    slide.addText(p, {
      x: px,
      y,
      w: cw,
      h: 0.34,
      fontFace: F.head,
      fontSize: 10,
      bold: true,
      color: done ? onNavy : active ? onTeal : C.navy,
      align: "center",
      isTextBox: true,
      margin: 0,
      valign: "middle",
    });
    if (i > 0) {
      slide.addShape("rect", {
        x: px - link,
        y: y + 0.16,
        w: link,
        h: 0.028,
        fill: { color: i <= currentIndex ? C.navy : C.rule },
        line: { type: "none" },
      });
    }
  });
}

/**
 * Table styling from the master's sample tables: Aberdeen Blue header row in
 * white bold, 1pt Onyx-tint grid, generous cell padding.
 */
export function tableOpts(
  colW: number[],
  rowH: number = ROW_H.body,
  fontSize: number = T.tableBody
): PptxGenJS.TableProps {
  const border = { type: "solid" as const, color: C.rule, pt: 1 };
  return {
    x: M,
    w: CW,
    colW,
    border: [border, border, border, border],
    fontFace: F.body,
    fontSize,
    color: C.onyx,
    valign: "middle",
    rowH,
    margin: 0.08,
  };
}

/**
 * Header row. The master left-aligns text headers and centres narrow numeric
 * ones, so pass the columns that should centre.
 */
export function headerRow(labels: string[], centre: number[] = []): PptxGenJS.TableRow {
  return labels.map((l, i) => ({
    text: l,
    options: {
      fill: { color: C.navy },
      color: onNavy,
      bold: true,
      fontFace: F.head,
      fontSize: T.tableHead,
      align: (centre.includes(i) ? "center" : "left") as "center" | "left",
      valign: "middle" as const,
    },
  }));
}

/** Pale-teal tint for a table's label column, as the master's samples do. */
export const tint = { fill: { color: C.tealTint } } as const;
