// ── HorizonView Standard PPM Model ────────────────────────────────────────────
// These types mirror the HorizonView Intelligence Layer tables produced by
// Fabric Notebooks (see architecture spec). Everything downstream consumes them.

export type HealthStatus = "Green" | "Amber" | "Red";
export type RaidType = "Risk" | "Assumption" | "Issue" | "Dependency" | "Decision";
export type MilestoneStatus = "Complete" | "On Track" | "At Risk" | "Late";

export interface Project {
  id: string;
  name: string;
  code: string;
  portfolio: string;
  sponsor: string;
  projectManager: string;
  phase: string;
  status: HealthStatus;
  percentComplete: number;
  startDate: string;
  endDate: string;
  // Intelligence Layer fields (AI-produced in Fabric Notebooks)
  healthScore: number;            // 0-100
  scheduleRiskScore: number;      // 0-100, higher = riskier
  budgetRiskScore: number;        // 0-100
  forecastCompletionDate: string; // ML forecast
  executiveSummary: string;
  riskNarrative: string;
  recommendedActions: string[];
  weeklyChangeSummary: string;
  decisionNeeded: string | null;
  podcastUrl: string | null;
  // Financials
  budget: number;
  actualsToDate: number;
  forecastAtCompletion: number;
  // Links
  sharePointUrl: string;
  powerBiReportUrl: string;
}

export interface RaidItem {
  id: string;
  projectId: string;
  type: RaidType;
  title: string;
  severity: "High" | "Medium" | "Low";
  owner: string;
  dueDate: string;
  status: "Open" | "In Progress" | "Closed" | "Overdue";
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  baselineDate: string;
  forecastDate: string;
  status: MilestoneStatus;
}

export interface PortfolioKpis {
  totalProjects: number;
  green: number;
  amber: number;
  red: number;
  totalBudget: number;
  totalActuals: number;
  budgetVariancePct: number;
  milestoneCompletionPct: number;
  openRaidCount: number;
  openDecisions: number;
  executiveHealthScore: number;
  portfolioSummary: string;
}

export interface Citation {
  source: "Semantic Model" | "SharePoint Lists" | "Documents" | "Intelligence Layer";
  detail: string;
}

export interface AgentAnswer {
  answer: string;
  citations: Citation[];
  route: string[];
}
