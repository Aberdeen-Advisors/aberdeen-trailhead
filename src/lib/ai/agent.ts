import { hasAi } from "@/lib/config";
import { chatCompletion } from "@/lib/ai/openai";
import { searchDocuments } from "@/lib/ai/documents";
import { getProjects, getRaid, getMilestones, getPortfolioKpis } from "@/lib/data/provider";
import { fmtMoney } from "@/lib/format";
import type { AgentAnswer, Citation, Project } from "@/lib/types";

// ── Ask Horizon ───────────────────────────────────────────────────────────────
// Routes questions across three governed sources and always cites them:
//   1. Semantic Model  — certified KPIs and metrics (structured questions)
//   2. SharePoint Lists — RAID, decisions, milestones (operational questions)
//   3. Onyx            — project documents (document questions)
// Combined questions use all three. Never answers without grounding data.

type Route = "metrics" | "operational" | "documents" | "combined";

function classify(q: string): Route {
  const s = q.toLowerCase();
  const docWords = ["charter", "document", "say about", "meeting", "notes", "lessons", "scope", "sow", "contract"];
  const opWords = ["decision", "overdue", "raid", "risk", "issue", "milestone", "action", "due", "open"];
  const metricWords = ["how many", "budget", "variance", "health", "score", "count", "percent", "spend", "cost", "red", "amber", "green"];
  const whyWords = ["why", "behind", "delayed", "late", "explain", "what happened"];
  const isDoc = docWords.some((w) => s.includes(w));
  const isOp = opWords.some((w) => s.includes(w));
  const isMetric = metricWords.some((w) => s.includes(w));
  const isWhy = whyWords.some((w) => s.includes(w));
  if (isWhy || [isDoc, isOp, isMetric].filter(Boolean).length > 1) return "combined";
  if (isDoc) return "documents";
  if (isOp) return "operational";
  return "metrics";
}

function findProject(q: string, projects: Project[]): Project | undefined {
  const s = q.toLowerCase();
  return projects.find((p) => s.includes(p.name.toLowerCase()) || s.includes(p.id) || s.includes(p.code.toLowerCase()));
}

export async function askHorizon(question: string): Promise<AgentAnswer> {
  const route = classify(question);
  const [projects, raid, milestones, kpis] = await Promise.all([
    getProjects(),
    getRaid(),
    getMilestones(),
    getPortfolioKpis(),
  ]);
  const project = findProject(question, projects);
  const citations: Citation[] = [];
  const routeSteps: string[] = [];

  // Gather grounding context per route
  let context = "";
  if (route === "metrics" || route === "combined") {
    routeSteps.push("Power BI Semantic Model");
    context += `PORTFOLIO METRICS (Semantic Model): ${kpis.totalProjects} projects — ${kpis.green} Green, ${kpis.amber} Amber, ${kpis.red} Red. Executive health score ${kpis.executiveHealthScore}. Budget ${fmtMoney(kpis.totalBudget)}, actuals ${fmtMoney(kpis.totalActuals)}, variance ${kpis.budgetVariancePct.toFixed(1)}%. Milestone completion ${kpis.milestoneCompletionPct.toFixed(0)}%.\n`;
    citations.push({ source: "Semantic Model", detail: "Certified portfolio KPIs" });
  }
  if (route === "operational" || route === "combined") {
    routeSteps.push("SharePoint Lists (RAID / Milestones)");
    const items = project ? raid.filter((r) => r.projectId === project.id) : raid;
    const ms = project ? milestones.filter((m) => m.projectId === project.id) : milestones;
    context += `RAID ITEMS: ${items.map((r) => `[${r.type}/${r.severity}/${r.status}] ${r.title} (owner ${r.owner}, due ${r.dueDate})`).join("; ")}\n`;
    context += `MILESTONES: ${ms.map((m) => `${m.name}: baseline ${m.baselineDate}, forecast ${m.forecastDate}, ${m.status}`).join("; ")}\n`;
    citations.push({ source: "SharePoint Lists", detail: project ? `${project.name} RAID log & milestones` : "Portfolio RAID log & milestones" });
  }
  if (route === "documents" || route === "combined") {
    routeSteps.push("Document Intelligence");
    const hits = await searchDocuments(question, project?.id);
    if (hits.length > 0) {
      context += `DOCUMENTS: ${hits.map((h) => `${h.document}: "${h.snippet}"`).join(" | ")}\n`;
      hits.forEach((h) => citations.push({ source: "Documents", detail: h.document }));
    }
  }
  if (project) {
    context += `PROJECT ${project.name}: status ${project.status}, health ${project.healthScore}, schedule risk ${project.scheduleRiskScore}, budget risk ${project.budgetRiskScore}, ${project.percentComplete}% complete, forecast finish ${project.forecastCompletionDate} vs baseline ${project.endDate}. Executive summary: ${project.executiveSummary} Risk narrative: ${project.riskNarrative}${project.decisionNeeded ? ` Decision needed: ${project.decisionNeeded}` : ""}\n`;
    citations.push({ source: "Intelligence Layer", detail: `${project.name} AI insights (Fabric)` });
  }

  // Live mode with AI credentials: grounded LLM answer.
  if (hasAi()) {
    const answer = await chatCompletion([
      {
        role: "system",
        content:
          "You are Ask Horizon, the HorizonView project intelligence agent. Answer ONLY from the provided grounding data. Never invent facts. Be concise and executive-ready. If the data does not contain the answer, say so.",
      },
      { role: "user", content: `GROUNDING DATA:\n${context}\nQUESTION: ${question}` },
    ]);
    return { answer, citations, route: routeSteps };
  }

  // Demo mode: deterministic grounded answers.
  return { answer: demoAnswer(question, route, { projects, raid: await getRaid(), kpis, project }), citations, route: routeSteps };
}

function demoAnswer(
  question: string,
  route: Route,
  ctx: {
    projects: Project[];
    raid: Awaited<ReturnType<typeof getRaid>>;
    kpis: Awaited<ReturnType<typeof getPortfolioKpis>>;
    project?: Project;
  }
): string {
  const s = question.toLowerCase();
  const { projects, raid, kpis, project } = ctx;

  if (project && (route === "combined" || s.includes("why"))) {
    return `${project.name} is ${project.status} (health ${project.healthScore}/100). ${project.executiveSummary} ${project.riskNarrative}${project.decisionNeeded ? ` Open decision: ${project.decisionNeeded}` : ""}`;
  }
  if (s.includes("red")) {
    const red = projects.filter((p) => p.status === "Red");
    return red.length
      ? `${red.length} project${red.length > 1 ? "s are" : " is"} Red: ${red.map((p) => `${p.name} (health ${p.healthScore}, forecast finish ${p.forecastCompletionDate} vs baseline ${p.endDate})`).join("; ")}.`
      : "No projects are currently Red.";
  }
  if (s.includes("decision")) {
    const d = raid.filter((r) => r.type === "Decision" && r.status !== "Closed");
    const overdue = d.filter((r) => r.status === "Overdue");
    return `${d.length} open decisions across the portfolio${overdue.length ? `, ${overdue.length} overdue` : ""}: ${d.map((r) => `"${r.title}" (${projects.find((p) => p.id === r.projectId)?.name}, owner ${r.owner}, due ${r.dueDate}, ${r.status})`).join("; ")}.`;
  }
  if (s.includes("budget") || s.includes("variance") || s.includes("spend")) {
    return `Portfolio budget is ${fmtMoney(kpis.totalBudget)} with ${fmtMoney(kpis.totalActuals)} actuals to date. Forecast-at-completion variance is ${kpis.budgetVariancePct >= 0 ? "+" : ""}${kpis.budgetVariancePct.toFixed(1)}%. Largest overrun risk: Project Phoenix (+$650K FAC vs budget, dual-run costs $95K/month during the carrier delay).`;
  }
  if (route === "documents" && project) {
    return `Per the project documents indexed by Onyx: see the cited sources below for ${project.name}. In demo mode a curated snippet set is searched; connect Onyx to query your full SharePoint document libraries.`;
  }
  if (s.includes("health")) {
    return `The portfolio executive health score is ${kpis.executiveHealthScore}/100 across ${kpis.totalProjects} projects (${kpis.green} Green, ${kpis.amber} Amber, ${kpis.red} Red). ${kpis.portfolioSummary}`;
  }
  return kpis.portfolioSummary;
}
