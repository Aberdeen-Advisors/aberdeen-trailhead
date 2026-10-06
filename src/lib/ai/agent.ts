import { hasAi } from "@/lib/config";
import { searchDocuments } from "@/lib/ai/documents";
import { getProjects, getRaid, getMilestones, getPortfolioKpis, openDecisions } from "@/lib/data/provider";
import { getProjectNarrative, isLiveProject } from "@/lib/ai/project-narrative";
import { hasSupabase, sbSelect } from "@/lib/supabase";
import { supabaseProjectIds, stackFor } from "@/lib/stacks";
import { ELEVATE_PROJECT_ID } from "@/lib/data/live-elevate";
import { fmtMoney } from "@/lib/format";
import type { AgentAnswer, Citation, Milestone, PortfolioKpis, Project, RaidItem } from "@/lib/types";

// ── Ask Horizon ───────────────────────────────────────────────────────────────
// A conversational agent over the whole portfolio. The model is given tools to
// look things up (portfolio overview, a project's detail, RAID, milestones, the
// project plan, weekly status, financials, documents) and decides which to call
// for each question, over as many turns as the conversation needs. It only
// reads data, never changes it, and every answer lists what it looked at.

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

type Ctx = { projects: Project[]; raid: RaidItem[]; milestones: Milestone[]; kpis: PortfolioKpis };

const today = () => new Date().toISOString().slice(0, 10);

function sourceOf(id: string): string {
  if (id === ELEVATE_PROJECT_ID) return "Power BI semantic model (from the Elevate SharePoint Lists)";
  if (hasSupabase() && supabaseProjectIds().includes(id)) return "HorizonView project database";
  return "demo sample data";
}
const sourceLabel = (id: string) =>
  id === ELEVATE_PROJECT_ID ? "Power BI semantic model" : hasSupabase() && supabaseProjectIds().includes(id) ? "HorizonView database" : "Demo data";

function resolveProject(ctx: Ctx, ref: unknown): Project | undefined {
  const s = String(ref ?? "").trim().toLowerCase();
  if (!s) return undefined;
  return (
    ctx.projects.find((p) => p.id === s || p.code.toLowerCase() === s || p.name.toLowerCase() === s) ??
    ctx.projects.find((p) => p.name.toLowerCase().includes(s) || s.includes(p.id))
  );
}

const dedupe = (items: RaidItem[]) => {
  const seen = new Set<string>();
  return items.filter((r) => {
    const k = `${r.projectId}|${r.type}|${r.title.trim().toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};
const sevRank = { High: 0, Medium: 1, Low: 2 } as const;
const stRank: Record<string, number> = { Overdue: 0, "In Progress": 1, Open: 2, Closed: 3 };

// ── Tools ─────────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "get_portfolio_overview",
    description: "Portfolio KPIs and one line per project (status, health, % complete, finish dates, budget, open RAID and decisions, data source). Start here for portfolio-wide questions.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_project",
    description: "Full detail for one project: status, health, schedule and budget, this week's update, the current executive summary, risks, recommended actions and decision needed.",
    parameters: { type: "object", properties: { project: { type: "string", description: "Project name, id or code, e.g. 'Alpha'" } }, required: ["project"], additionalProperties: false },
  },
  {
    name: "list_raid",
    description: "RAID items (risks, assumptions, issues, dependencies, decisions). Repeated titles are combined. Filter by project, type, status or severity.",
    parameters: {
      type: "object",
      properties: {
        project: { type: "string", description: "Optional project name/id; omit for the whole portfolio" },
        type: { type: "string", enum: ["Risk", "Assumption", "Issue", "Dependency", "Decision"] },
        status: { type: "string", enum: ["open", "overdue", "closed", "all"], description: "Default 'open' (anything not closed)" },
        severity: { type: "string", enum: ["High", "Medium", "Low"] },
        limit: { type: "number", description: "Max items, default 25" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_milestones",
    description: "Milestones with baseline and forecast dates and status. Filter by project, status, or a date window.",
    parameters: {
      type: "object",
      properties: {
        project: { type: "string" },
        status: { type: "string", enum: ["Complete", "On Track", "At Risk", "Late", "not complete"] },
        from: { type: "string", description: "YYYY-MM-DD, forecast on or after" },
        to: { type: "string", description: "YYYY-MM-DD, forecast on or before" },
        limit: { type: "number", description: "Max items, default 30" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_project_plan",
    description: "The task plan (tasks and activities with start, finish, status, % done, owner, workstream) and workstream progress. Only for projects kept in the HorizonView project database.",
    parameters: { type: "object", properties: { project: { type: "string" } }, required: ["project"], additionalProperties: false },
  },
  {
    name: "get_weekly_status",
    description: "Weekly status updates by workstream (RAG, summary, path to green) for a project kept in the HorizonView project database, most recent weeks first.",
    parameters: { type: "object", properties: { project: { type: "string" }, weeks: { type: "number", description: "How many recent weeks, default 2" } }, required: ["project"], additionalProperties: false },
  },
  {
    name: "get_financials",
    description: "Budget, spend to date and forecast at completion by workstream and month ($K, cumulative) for a project kept in the HorizonView project database.",
    parameters: { type: "object", properties: { project: { type: "string" } }, required: ["project"], additionalProperties: false },
  },
  {
    name: "search_documents",
    description: "Search project documents (charters, SOWs, meeting notes, lessons learned) and return matching snippets.",
    parameters: { type: "object", properties: { query: { type: "string" }, project: { type: "string" } }, required: ["query"], additionalProperties: false },
  },
] as const;

type ToolName = (typeof TOOLS)[number]["name"];

async function runTool(name: ToolName, args: Record<string, any>, ctx: Ctx, cite: (c: Citation) => void): Promise<unknown> {
  const proj = args.project ? resolveProject(ctx, args.project) : undefined;
  if (args.project && !proj) return { error: `No project matches "${args.project}". Projects: ${ctx.projects.map((p) => p.name).join(", ")}` };

  switch (name) {
    case "get_portfolio_overview": {
      cite({ source: "Portfolio", detail: `All ${ctx.projects.length} projects` });
      const decs = openDecisions(ctx.raid);
      return {
        today: today(),
        kpis: {
          projects: ctx.kpis.totalProjects, green: ctx.kpis.green, amber: ctx.kpis.amber, red: ctx.kpis.red,
          averageHealth: ctx.kpis.executiveHealthScore, totalBudget: fmtMoney(ctx.kpis.totalBudget), spent: fmtMoney(ctx.kpis.totalActuals),
          budgetVariancePct: Number(ctx.kpis.budgetVariancePct.toFixed(1)), milestonesCompletePct: Math.round(ctx.kpis.milestoneCompletionPct),
          openRaid: ctx.kpis.openRaidCount, openDecisions: decs.length, overdueDecisions: decs.filter((d) => d.status === "Overdue").length,
        },
        projects: ctx.projects.map((p) => ({
          name: p.name, id: p.id, status: p.status, health: p.healthScore, phase: p.phase, percentComplete: p.percentComplete,
          baselineFinish: p.endDate, forecastFinish: p.forecastCompletionDate,
          budget: p.budget > 0 ? fmtMoney(p.budget) : "not tracked", spent: p.budget > 0 ? fmtMoney(p.actualsToDate) : undefined,
          forecastAtCompletion: p.budget > 0 ? fmtMoney(p.forecastAtCompletion) : undefined,
          openRaid: ctx.raid.filter((r) => r.projectId === p.id && r.status !== "Closed").length,
          openDecisions: decs.filter((d) => d.projectId === p.id).length,
          mostUrgentDecision: (() => {
            const d = decs.find((x) => x.projectId === p.id);
            return d ? `${d.title} (${d.status}, due ${d.dueDate || "n/a"}, owner ${d.owner && d.owner !== "—" ? d.owner : "unassigned"})` : undefined;
          })(),
          thisWeek: p.weeklyChangeSummary, dataSource: sourceOf(p.id),
        })),
      };
    }
    case "get_project": {
      if (!proj) return { error: "project is required" };
      cite({ source: sourceLabel(proj.id), detail: `${proj.name} status and narrative` });
      const n = isLiveProject(proj.id) ? await getProjectNarrative(proj, ctx.raid, ctx.milestones) : null;
      const decs = openDecisions(ctx.raid).filter((d) => d.projectId === proj.id);
      return {
        name: proj.name, code: proj.code, portfolio: proj.portfolio, sponsor: proj.sponsor, projectManager: proj.projectManager,
        status: proj.status, health: proj.healthScore, scheduleRisk: proj.scheduleRiskScore, budgetRisk: proj.budget > 0 ? proj.budgetRiskScore : undefined,
        phase: proj.phase, percentComplete: proj.percentComplete, start: proj.startDate, baselineFinish: proj.endDate, forecastFinish: proj.forecastCompletionDate,
        budget: proj.budget > 0 ? { budget: fmtMoney(proj.budget), spent: fmtMoney(proj.actualsToDate), forecastAtCompletion: fmtMoney(proj.forecastAtCompletion) } : "not tracked",
        thisWeek: proj.weeklyChangeSummary,
        executiveSummary: n?.executiveSummary ?? proj.executiveSummary,
        riskNarrative: n?.riskNarrative || proj.riskNarrative,
        recommendedActions: (n?.recommendedActions ?? proj.recommendedActions).slice(0, 6),
        openDecisions: decs.slice(0, 6).map((d) => ({ title: d.title, owner: d.owner, due: d.dueDate, status: d.status })),
        runsOn: stackFor(proj.id), dataSource: sourceOf(proj.id),
        hasPlanInHorizonView: hasSupabase() && supabaseProjectIds().includes(proj.id),
      };
    }
    case "list_raid": {
      const status = (args.status as string) ?? "open";
      let items = ctx.raid.filter((r) => !proj || r.projectId === proj.id);
      if (args.type) items = items.filter((r) => r.type === args.type);
      if (args.severity) items = items.filter((r) => r.severity === args.severity);
      if (status === "open") items = items.filter((r) => r.status !== "Closed");
      else if (status === "overdue") items = items.filter((r) => r.status === "Overdue" || (r.status !== "Closed" && !!r.dueDate && r.dueDate < today()));
      else if (status === "closed") items = items.filter((r) => r.status === "Closed");
      const total = items.length;
      items = dedupe(items).sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || (stRank[a.status] ?? 9) - (stRank[b.status] ?? 9) || (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
      const limit = Math.min(Number(args.limit) || 25, 60);
      cite({ source: proj ? sourceLabel(proj.id) : "Portfolio", detail: `${proj ? proj.name + " " : ""}RAID log${args.type ? ` (${args.type})` : ""}` });
      return {
        matching: total, distinct: items.length, showing: Math.min(limit, items.length),
        items: items.slice(0, limit).map((r) => ({
          id: r.id, project: ctx.projects.find((p) => p.id === r.projectId)?.name, type: r.type, title: r.title,
          severity: r.severity, status: r.status, owner: r.owner && r.owner !== "—" ? r.owner : "unassigned", due: r.dueDate,
          pastDue: r.status !== "Closed" && !!r.dueDate && r.dueDate < today() ? true : undefined,
        })),
      };
    }
    case "list_milestones": {
      let ms = ctx.milestones.filter((m) => !proj || m.projectId === proj.id);
      if (args.status === "not complete") ms = ms.filter((m) => m.status !== "Complete");
      else if (args.status) ms = ms.filter((m) => m.status === args.status);
      if (args.from) ms = ms.filter((m) => m.forecastDate >= String(args.from));
      if (args.to) ms = ms.filter((m) => m.forecastDate <= String(args.to));
      ms = [...ms].sort((a, b) => a.forecastDate.localeCompare(b.forecastDate));
      const limit = Math.min(Number(args.limit) || 30, 80);
      cite({ source: proj ? sourceLabel(proj.id) : "Portfolio", detail: `${proj ? proj.name + " " : ""}milestones` });
      return {
        matching: ms.length, showing: Math.min(limit, ms.length),
        milestones: ms.slice(0, limit).map((m) => ({
          project: ctx.projects.find((p) => p.id === m.projectId)?.name, name: m.name, baseline: m.baselineDate, forecast: m.forecastDate,
          slipDays: m.baselineDate && m.forecastDate ? Math.round((Date.parse(m.forecastDate) - Date.parse(m.baselineDate)) / 86_400_000) : undefined,
          status: m.status,
        })),
      };
    }
    case "get_project_plan":
    case "get_weekly_status":
    case "get_financials": {
      if (!proj) return { error: "project is required" };
      if (!(hasSupabase() && supabaseProjectIds().includes(proj.id))) {
        return { error: `${proj.name} does not keep this in HorizonView (its data source is ${sourceOf(proj.id)}). Use get_project, list_raid or list_milestones instead.` };
      }
      const q = `project_id=eq.${encodeURIComponent(proj.id)}`;
      const ws = await sbSelect("workstreams", `${q}&order=sort_order.asc`);
      const wsName = new Map(ws.map((w) => [String(w.id), String(w.name)]));
      const wn = (id: unknown) => (id ? wsName.get(String(id)) ?? "" : "Project level");
      if (name === "get_project_plan") {
        cite({ source: "HorizonView database", detail: `${proj.name} project plan` });
        const acts = await sbSelect("activities", `${q}&order=start_date.asc.nullslast`);
        return {
          today: today(),
          workstreams: ws.map((w) => ({ name: w.name, lead: w.lead, percentComplete: w.pct_complete, percentPlanned: w.pct_planned, health: w.health_score })),
          tasks: acts.map((a) => ({
            type: a.update_type, title: a.title, workstream: wn(a.workstream_id), owner: a.owner, status: a.status,
            start: a.start_date, finish: a.target_date, percentDone: a.pct_complete,
            pastFinish: a.status !== "Closed" && a.target_date && String(a.target_date) < today() ? true : undefined,
          })),
        };
      }
      if (name === "get_weekly_status") {
        cite({ source: "HorizonView database", detail: `${proj.name} weekly status` });
        const su = await sbSelect("status_updates", `${q}&order=week_of.desc`);
        const weeks = Array.from(new Set(su.map((s) => String(s.week_of)))).slice(0, Math.min(Number(args.weeks) || 2, 8));
        return {
          updates: su.filter((s) => weeks.includes(String(s.week_of))).map((s) => ({
            weekOf: s.week_of, workstream: wn(s.workstream_id), owner: s.owner, internalStatus: s.internal_status, externalStatus: s.external_status,
            summary: s.external_summary ?? s.internal_summary, pathToGreen: s.go_to_green_plan,
          })),
        };
      }
      cite({ source: "HorizonView database", detail: `${proj.name} financials` });
      const fin = await sbSelect("financials", `${q}&order=month.asc`);
      const byWs: Record<string, { month: string; planK: number | null; actualK: number | null; forecastK: number | null }[]> = {};
      const budgets: Record<string, number> = {};
      for (const f of fin) {
        const n = wn(f.workstream_id);
        (byWs[n] ??= []).push({ month: String(f.month).slice(0, 7), planK: f.plan_k == null ? null : Number(f.plan_k), actualK: f.actual_k == null ? null : Number(f.actual_k), forecastK: f.forecast_k == null ? null : Number(f.forecast_k) });
        if (f.workstream_budget != null) budgets[n] = Number(f.workstream_budget);
      }
      return { note: "Values are cumulative $K by month.", projectBudget: fmtMoney(proj.budget), spentToDate: fmtMoney(proj.actualsToDate), forecastAtCompletion: fmtMoney(proj.forecastAtCompletion), workstreamBudgets: budgets, byWorkstream: byWs };
    }
    case "search_documents": {
      const hits = await searchDocuments(String(args.query ?? ""), proj?.id);
      hits.slice(0, 6).forEach((h) => cite({ source: "Documents", detail: h.document }));
      return { hits: hits.slice(0, 6) };
    }
  }
}

// ── Model call with tools ─────────────────────────────────────────────────────

type Msg =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[] }
  | { role: "tool"; tool_call_id: string; content: string };

async function complete(messages: Msg[]): Promise<{ content: string | null; tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[] }> {
  const azureKey = process.env.AZURE_OPENAI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  let url: string;
  let headers: Record<string, string>;
  let model: string | undefined;
  if (azureKey && process.env.AZURE_OPENAI_ENDPOINT) {
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o";
    url = `${process.env.AZURE_OPENAI_ENDPOINT.replace(/\/$/, "")}/openai/deployments/${deployment}/chat/completions?api-version=2024-06-01`;
    headers = { "api-key": azureKey, "Content-Type": "application/json" };
  } else if (openaiKey) {
    url = "https://api.openai.com/v1/chat/completions";
    headers = { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" };
    model = process.env.OPENAI_MODEL ?? "gpt-4o";
  } else {
    throw new Error("No AI credentials configured.");
  }
  const res = await fetch(url, {
    method: "POST",
    headers,
    cache: "no-store",
    body: JSON.stringify({
      ...(model ? { model } : {}),
      messages,
      temperature: 0.2,
      tools: TOOLS.map((t) => ({ type: "function", function: t })),
      tool_choice: "auto",
    }),
  });
  if (!res.ok) throw new Error(`AI request failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.choices?.[0]?.message ?? { content: "" };
}

function systemPrompt(ctx: Ctx): string {
  return [
    "You are Ask Horizon, the AI analyst inside HorizonView, Aberdeen Advisors' project and portfolio platform. You are talking with executives and PMO leads about their portfolio.",
    `Today is ${today()}. The portfolio has ${ctx.projects.length} projects: ${ctx.projects.map((p) => `${p.name} (${p.status})`).join(", ")}.`,
    "Data sources: Project Elevate is live from the client's Power BI semantic model (fed by SharePoint Lists); projects kept in the HorizonView project database (e.g. Project Alpha) are live and edited in HorizonView; the other projects are demo sample data. Mention that a project is demo data only if the user asks where data comes from.",
    "Always use the tools to look up facts before answering. Never guess or invent numbers, names, owners or dates. If the tools do not have the answer, say so plainly and suggest where it might live.",
    "Use earlier turns of the conversation for context (e.g. 'it', 'that project', 'what about Compass?').",
    "Style: direct and executive-ready. Lead with the answer in one or two sentences, then supporting detail. Use short bullet lists ('- ') for several items and **bold** for key figures sparingly. Keep most answers under 180 words unless the user asks for more. Write dates like 'Jul 10'.",
    "You can only read data. If asked to change something, explain where in HorizonView the user can do it (e.g. the tables on the project page).",
  ].join("\n");
}

const STEP_LABEL: Record<ToolName, string> = {
  get_portfolio_overview: "Portfolio overview",
  get_project: "Project detail",
  list_raid: "RAID log",
  list_milestones: "Milestones",
  get_project_plan: "Project plan",
  get_weekly_status: "Weekly status",
  get_financials: "Financials",
  search_documents: "Documents",
};

export async function askHorizon(input: string | ChatTurn[]): Promise<AgentAnswer> {
  const history: ChatTurn[] = typeof input === "string" ? [{ role: "user", content: input }] : input;
  const question = [...history].reverse().find((t) => t.role === "user")?.content ?? "";
  const [projects, raid, milestones, kpis] = await Promise.all([getProjects(), getRaid(), getMilestones(), getPortfolioKpis()]);
  const ctx: Ctx = { projects, raid, milestones, kpis };

  if (!hasAi()) {
    return { answer: demoAnswer(question, ctx), citations: [{ source: "Portfolio", detail: "Built-in answers (no AI key configured)" }], route: ["Rules-based"] };
  }

  const citations: Citation[] = [];
  const cite = (c: Citation) => {
    if (!citations.some((x) => x.source === c.source && x.detail === c.detail)) citations.push(c);
  };
  const steps: string[] = [];
  const messages: Msg[] = [
    { role: "system", content: systemPrompt(ctx) },
    ...history.slice(-16).map((t) => ({ role: t.role, content: t.content.slice(0, 4000) }) as Msg),
  ];

  for (let round = 0; round < 6; round++) {
    const msg = await complete(messages);
    if (!msg.tool_calls?.length) {
      return { answer: (msg.content ?? "").trim() || "I couldn't find an answer to that in the portfolio data.", citations, route: steps };
    }
    messages.push({ role: "assistant", content: msg.content ?? null, tool_calls: msg.tool_calls });
    for (const call of msg.tool_calls) {
      const name = call.function.name as ToolName;
      let args: Record<string, any> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        /* empty args */
      }
      let result: unknown;
      try {
        result = TOOLS.some((t) => t.name === name) ? await runTool(name, args, ctx, cite) : { error: `Unknown tool ${name}` };
      } catch (e) {
        console.error(`[ask] tool ${name} failed`, e);
        result = { error: "That lookup failed; try a different question or tool." };
      }
      const label = STEP_LABEL[name] + (args.project ? ` · ${resolveProject(ctx, args.project)?.name ?? args.project}` : "");
      if (STEP_LABEL[name] && !steps.includes(label)) steps.push(label);
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result).slice(0, 24_000) });
    }
  }
  // Too many lookups: ask for a final answer with what it has.
  messages.push({ role: "user", content: "Please answer now with the information you have gathered." });
  const final = await complete(messages);
  return { answer: (final.content ?? "").trim(), citations, route: steps };
}

// ── Without an AI key: simple grounded answers ────────────────────────────────
function demoAnswer(question: string, ctx: Ctx): string {
  const s = question.toLowerCase();
  const { projects, raid, kpis } = ctx;
  const project = projects.find((p) => s.includes(p.name.toLowerCase()) || s.includes(p.id));
  if (project) {
    return `${project.name} is ${project.status} (health ${project.healthScore}/100, ${project.percentComplete}% complete). ${project.weeklyChangeSummary}`;
  }
  if (s.includes("red")) {
    const red = projects.filter((p) => p.status === "Red");
    return red.length ? `${red.length} Red: ${red.map((p) => `${p.name} (health ${p.healthScore})`).join("; ")}.` : "No projects are currently Red.";
  }
  if (s.includes("decision")) {
    const d = openDecisions(raid);
    return `${d.length} open decisions: ${d.slice(0, 6).map((r) => `"${r.title}" (${projects.find((p) => p.id === r.projectId)?.name}, ${r.status})`).join("; ")}.`;
  }
  return `The portfolio has ${kpis.totalProjects} projects (${kpis.green} Green, ${kpis.amber} Amber, ${kpis.red} Red) with average health ${kpis.executiveHealthScore}/100. Add an OpenAI key for full conversational answers.`;
}
