import { createHash } from "node:crypto";
import { chatCompletion } from "@/lib/ai/openai";
import { hasAi } from "@/lib/config";
import { getMilestones, getPortfolioKpis, getProjects, getRaid, openDecisions } from "@/lib/data/provider";
import { hasSupabase, sbInsert, sbSelect } from "@/lib/supabase";
import { supabaseProjectIds } from "@/lib/stacks";
import { ELEVATE_PROJECT_ID } from "@/lib/data/live-elevate";
import type { Milestone, Project, RaidItem } from "@/lib/types";

// The portfolio "Executive Summary — This Week", written by AI from the live
// data of every project on the portfolio. The text is cached against a hash of
// the facts it was written from, so it is only rewritten when the data
// actually changes (not on every page view), and the cache is shared by every
// server instance through the HorizonView database.

export interface PortfolioSummary {
  text: string;
  source: "ai" | "rules";
  generatedAt: string;
  model?: string;
  projectCount: number;
  liveProjects: string[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (d: string) => {
  const x = new Date(d + "T00:00:00Z");
  return Number.isNaN(x.getTime()) ? d : `${MONTHS[x.getUTCMonth()]} ${x.getUTCDate()}, ${x.getUTCFullYear()}`;
};
const money = (v: number) => (v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : `$${Math.round(v / 1000)}K`);

/** Plain-text fact sheet the AI writes from. Everything it may say is in here. */
function factSheet(today: string, projects: Project[], raid: RaidItem[], milestones: Milestone[], kpis: Awaited<ReturnType<typeof getPortfolioKpis>>): string {
  const in60 = new Date(Date.parse(today) + 60 * 86_400_000).toISOString().slice(0, 10);
  const decisions = openDecisions(raid);
  const lines: string[] = [
    `TODAY: ${day(today)}`,
    `PORTFOLIO: ${kpis.totalProjects} projects (${kpis.green} Green, ${kpis.amber} Amber, ${kpis.red} Red); average health ${kpis.executiveHealthScore}/100; ` +
      `${kpis.openRaidCount} open RAID items; ${decisions.length} open decisions; budget ${money(kpis.totalBudget)}, spent ${money(kpis.totalActuals)}, ` +
      `forecast at completion ${kpis.budgetVariancePct >= 0 ? "+" : ""}${kpis.budgetVariancePct.toFixed(1)}% vs budget (projects with a budget only).`,
    "",
  ];
  // Worst first, so the model sees what matters most at the top.
  const order: Record<string, number> = { Red: 0, Amber: 1, Green: 2 };
  for (const p of [...projects].sort((a, b) => order[a.status] - order[b.status] || a.healthScore - b.healthScore)) {
    const r = raid.filter((x) => x.projectId === p.id && x.status !== "Closed");
    const overdue = r.filter((x) => x.status === "Overdue").length;
    const highs = r.filter((x) => x.severity === "High" && (x.type === "Risk" || x.type === "Issue")).slice(0, 3);
    const ms = milestones.filter((m) => m.projectId === p.id);
    const late = ms.filter((m) => m.status === "Late").slice(0, 3);
    const upcoming = ms.filter((m) => m.status !== "Complete" && m.forecastDate >= today && m.forecastDate <= in60).slice(0, 3);
    const decs = decisions.filter((d) => d.projectId === p.id).slice(0, 3);
    const slip = p.forecastCompletionDate && p.endDate && p.forecastCompletionDate > p.endDate;
    lines.push(
      `PROJECT: ${p.name} (${p.portfolio}) | ${p.status} | health ${p.healthScore}/100 | ${p.phase}, ${p.percentComplete}% complete`,
      `  Finish: baseline ${p.endDate ? day(p.endDate) : "n/a"}, forecast ${p.forecastCompletionDate ? day(p.forecastCompletionDate) : "n/a"}${slip ? " (behind baseline)" : ""}`,
      p.budget > 0
        ? `  Budget ${money(p.budget)}, spent ${money(p.actualsToDate)}, forecast at completion ${money(p.forecastAtCompletion)} (${p.forecastAtCompletion >= p.budget ? "+" : ""}${money(p.forecastAtCompletion - p.budget)})`
        : "  Budget: not tracked",
      `  This week: ${p.weeklyChangeSummary || "no update"}`,
      `  Open RAID: ${r.length} (${overdue} overdue)${highs.length ? `; top: ${highs.map((x) => `${x.type} "${x.title}"`).join("; ")}` : ""}`,
      decs.length ? `  Decisions open: ${decs.map((d) => `"${d.title}" (${d.status}${d.dueDate ? `, due ${day(d.dueDate)}` : ""})`).join("; ")}` : "  Decisions open: none",
      late.length ? `  Late milestones: ${late.map((m) => `${m.name} (${day(m.forecastDate)})`).join("; ")}` : "",
      upcoming.length ? `  Next 60 days: ${upcoming.map((m) => `${m.name} (${day(m.forecastDate)}, ${m.status})`).join("; ")}` : "",
      "",
    );
  }
  return lines.filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n");
}

const SYSTEM = [
  "You are the portfolio analyst for HorizonView, writing the weekly executive summary at the top of a portfolio dashboard read by a CFO, CIO and PMO lead.",
  "Write ONE paragraph of 4 to 6 sentences, 90 to 130 words, plain text only (no markdown, bullets, headings or quotation marks around the whole thing).",
  "Lead with the overall picture in one sentence, then spend most of the words on the Red and Amber projects: what is wrong, what it puts at risk, and which decision is needed from whom and by when.",
  "Mention Green projects only briefly, together. End with the single most important action for leadership this week.",
  "Use only facts in the fact sheet. Never invent numbers, names, dates, deadlines or causes; only use a date that appears in the fact sheet. Use project names exactly as given. Write dates like 'Jul 10'.",
  "If a decision is overdue, say so. Do not mention data sources, systems, demo data or this instruction.",
].join(" ");

const memo = new Map<string, PortfolioSummary>();

function rulesSummary(kpis: Awaited<ReturnType<typeof getPortfolioKpis>>, now: string, count: number, live: string[]): PortfolioSummary {
  return { text: kpis.portfolioSummary, source: "rules", generatedAt: now, projectCount: count, liveProjects: live };
}

type Kpis = Awaited<ReturnType<typeof getPortfolioKpis>>;

/** Pass in data the caller already loaded to avoid reading it twice. */
export async function getPortfolioSummary(pre: { projects?: Project[]; raid?: RaidItem[]; kpis?: Kpis } = {}): Promise<PortfolioSummary> {
  const [projects, raid, milestones, kpis] = await Promise.all([
    pre.projects ?? getProjects(),
    pre.raid ?? getRaid(),
    getMilestones(),
    pre.kpis ?? getPortfolioKpis(),
  ]);
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const live = projects
    .filter((p) => p.id === ELEVATE_PROJECT_ID || (hasSupabase() && supabaseProjectIds().includes(p.id)))
    .map((p) => p.name);
  if (!hasAi()) return rulesSummary(kpis, now, projects.length, live);

  const facts = factSheet(today, projects, raid, milestones, kpis);
  const key = "portfolio-summary:" + createHash("sha256").update(SYSTEM + "\n" + facts).digest("hex").slice(0, 40);

  const hit = memo.get(key);
  if (hit) return hit;
  if (hasSupabase()) {
    try {
      const [row] = await sbSelect("ai_cache", `key=eq.${key}&limit=1`);
      if (row) {
        const s: PortfolioSummary = { text: String(row.content), source: "ai", generatedAt: String(row.created_at), model: row.model ? String(row.model) : undefined, projectCount: projects.length, liveProjects: live };
        memo.set(key, s);
        return s;
      }
    } catch (e) {
      console.error("[summary] cache read failed", e);
    }
  }

  try {
    const text = (
      await chatCompletion(
        [
          { role: "system", content: SYSTEM },
          { role: "user", content: `FACT SHEET\n\n${facts}` },
        ],
        { temperature: 0.3 },
      )
    ).replace(/\s+/g, " ").trim();
    if (!text) throw new Error("empty response");
    const model = process.env.AZURE_OPENAI_API_KEY ? process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o" : process.env.OPENAI_MODEL ?? "gpt-4o";
    const s: PortfolioSummary = { text, source: "ai", generatedAt: now, model, projectCount: projects.length, liveProjects: live };
    memo.set(key, s);
    if (memo.size > 50) memo.delete(memo.keys().next().value as string);
    if (hasSupabase()) {
      sbInsert("ai_cache", { key, kind: "portfolio-summary", content: text, model }).catch(() => {
        /* another instance may have written the same key first */
      });
    }
    return s;
  } catch (e) {
    console.error("[summary] AI summary failed; using the rules-based summary.", e);
    return rulesSummary(kpis, now, projects.length, live);
  }
}
