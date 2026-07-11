import JSZip from "jszip";

// Fills the branded SteerCo skeleton (src/assets/steerco-skeleton.pptx, derived
// from "Aberdeen Slide Template_DOT_v2") with live portal data. The skeleton
// carries the real corporate masters/layouts/theme; we only swap {{tokens}},
// clone the project slide per project, and fix up package bookkeeping.

// Skeleton slide files (fixed at skeleton build time):
const COVER = "ppt/slides/slide8.xml";
const PORTFOLIO = "ppt/slides/slide9.xml";
const PROJECT = "ppt/slides/slide10.xml";
const DECISIONS = "ppt/slides/slide11.xml";
const CHIP_MARKER = "C0FFE1"; // status chip fill placeholder color

export interface DeckKpi { label: string; value: string }
export interface DeckProject {
  name: string; meta: string; status: "Green" | "Amber" | "Red";
  summary: string; risks: string[]; actions: string[]; milestones: string[];
}
export interface DeckDecision { title: string; project: string; owner: string; due: string; status: string }
export interface DeckData {
  title: string; subtitle: string; date: string;
  portfolio?: { kpis: DeckKpi[]; summary: string };
  projects: DeckProject[];
  decisions?: DeckDecision[];
}

const STATUS_FILL: Record<DeckProject["status"], string> = {
  Green: "00A676",
  Amber: "E8A100", // darkened gold so white chip text stays legible
  Red: "D85049",
};

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function fill(xml: string, map: Record<string, string>): string {
  return xml.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) => (k in map ? esc(map[k]) : m));
}

// Replicate the block (<a:p> or <a:tr>) containing `token` once per entry.
function replicate(xml: string, token: string, entries: Array<Record<string, string>>, tag: "a:p" | "a:tr"): string {
  const at = xml.indexOf(token);
  if (at < 0) return xml;
  const start = xml.lastIndexOf(`<${tag}`, at);
  const end = xml.indexOf(`</${tag}>`, at) + tag.length + 3;
  const block = xml.slice(start, end);
  const rendered = entries.map((e) => fill(block, e)).join("");
  return xml.slice(0, start) + rendered + xml.slice(end);
}

export async function renderSteerCoDeck(skeleton: Buffer, data: DeckData): Promise<Buffer> {
  const zip = await JSZip.loadAsync(skeleton);
  const read = (p: string) => zip.file(p)!.async("string");
  let pres = await read("ppt/presentation.xml");
  let presRels = await read("ppt/_rels/presentation.xml.rels");
  let types = await read("[Content_Types].xml");

  // ── Cover ──
  zip.file(COVER, fill(await read(COVER), {
    DECK_TITLE: data.title, DECK_SUBTITLE: data.subtitle, DECK_DATE: data.date,
  }));

  // ── Portfolio health (drop the slide entirely for single-project decks) ──
  if (data.portfolio) {
    let xml = await read(PORTFOLIO);
    const map: Record<string, string> = { PORTFOLIO_SUMMARY: data.portfolio.summary };
    data.portfolio.kpis.slice(0, 6).forEach((k, i) => {
      map[`K${i + 1}L`] = k.label; map[`K${i + 1}V`] = k.value;
    });
    zip.file(PORTFOLIO, fill(xml, map));
  }

  // ── Project slides: clone the template slide per project ──
  const projectXml = await read(PROJECT);
  const projectRels = await read("ppt/slides/_rels/slide10.xml.rels");
  const renderProject = (p: DeckProject): string => {
    let xml = projectXml.replace(CHIP_MARKER, STATUS_FILL[p.status]);
    for (const { token, items } of [
      { token: "P_RISKS", items: p.risks },
      { token: "P_ACTIONS", items: p.actions },
      { token: "P_MILESTONES", items: p.milestones },
    ]) {
      xml = replicate(xml, `{{${token}}}`, (items.length ? items : ["—"]).map((t) => ({ [token]: t })), "a:p");
    }
    return fill(xml, { P_NAME: p.name, P_META: p.meta, P_STATUS: p.status, P_SUMMARY: p.summary });
  };

  const projectFiles: string[] = [];
  data.projects.forEach((p, i) => {
    if (i === 0) {
      zip.file(PROJECT, renderProject(p));
      projectFiles.push(PROJECT);
    } else {
      const name = `ppt/slides/slideC${i}.xml`;
      zip.file(name, renderProject(p));
      zip.file(`ppt/slides/_rels/slideC${i}.xml.rels`, projectRels);
      types = types.replace(
        "</Types>",
        `<Override PartName="/${name}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`
      );
      projectFiles.push(name);
    }
  });

  // ── Decisions table ──
  if (data.decisions?.length) {
    let xml = await read(DECISIONS);
    xml = replicate(xml, "{{D_TITLE}}", data.decisions.map((d) => ({
      D_TITLE: d.title, D_PROJECT: d.project, D_OWNER: d.owner, D_DUE: d.due, D_STATUS: d.status,
    })), "a:tr");
    zip.file(DECISIONS, xml);
  }

  // ── Rebuild the slide list ──
  const relFor: Record<string, string> = {};
  const relRe = /Id="(rId\d+)"[^>]*Target="([^"]+)"/g;
  let rm: RegExpExecArray | null;
  let maxRid = 0;
  while ((rm = relRe.exec(presRels))) {
    relFor[`ppt/${rm[2]}`] = rm[1];
    maxRid = Math.max(maxRid, Number(rm[1].slice(3)));
  }
  let nextRid = maxRid + 1;
  let nextSid = 600;

  const keep: string[] = [COVER];
  if (data.portfolio) keep.push(PORTFOLIO);
  keep.push(...projectFiles);
  if (data.decisions?.length) keep.push(DECISIONS);

  const drop = [PORTFOLIO, DECISIONS].filter((f) => !keep.includes(f));
  for (const f of drop) {
    zip.remove(f);
    zip.remove(`ppt/slides/_rels/${f.split("/").pop()}.rels`);
    types = types.replace(new RegExp(`<Override PartName="/${f.replace(/\//g, "\\/")}"[^>]*/>`), "");
    presRels = presRels.replace(new RegExp(`<Relationship Id="${relFor[f]}"[^>]*/>`), "");
  }

  const sldIds = keep.map((f) => {
    let rid = relFor[f];
    if (!rid) {
      rid = `rId${nextRid++}`;
      presRels = presRels.replace(
        "</Relationships>",
        `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="${f.replace("ppt/", "")}"/></Relationships>`
      );
    }
    return `<p:sldId id="${nextSid++}" r:id="${rid}"/>`;
  });
  pres = pres.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, `<p:sldIdLst>${sldIds.join("")}</p:sldIdLst>`);

  zip.file("ppt/presentation.xml", pres);
  zip.file("ppt/_rels/presentation.xml.rels", presRels);
  zip.file("[Content_Types].xml", types);

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }) as Promise<Buffer>;
}
