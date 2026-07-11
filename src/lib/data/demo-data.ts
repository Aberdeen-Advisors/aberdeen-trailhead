import type { Project, RaidItem, Milestone } from "@/lib/types";

// Realistic demo portfolio. In live mode these records come from the
// HorizonView Intelligence Layer tables in Microsoft Fabric.

export const demoProjects: Project[] = [
  {
    id: "alpha",
    name: "Project Alpha",
    code: "ERP-001",
    portfolio: "ERP Transformation",
    sponsor: "S. Grant (CFO)",
    projectManager: "M. Chen",
    phase: "Build",
    status: "Amber",
    percentComplete: 62,
    startDate: "2025-09-01",
    endDate: "2026-11-30",
    healthScore: 68,
    scheduleRiskScore: 71,
    budgetRiskScore: 44,
    forecastCompletionDate: "2026-12-18",
    executiveSummary:
      "Project Alpha remains in Build with 62% complete. Data conversion defects in the finance workstream pushed SIT entry by two weeks. Budget remains within tolerance, but the schedule risk score rose from 58 to 71 driven by vendor testing capacity. Recovery plan under review with the SI partner.",
    riskNarrative:
      "Primary risk is SIT entry slippage compounding into UAT and cutover. Vendor test-lead attrition and open Sev-2 conversion defects are the leading indicators. Budget exposure is limited to extended SI hours (~$180K downside).",
    recommendedActions: [
      "Approve two-week SIT recovery plan with added vendor test capacity",
      "Escalate Sev-2 data conversion defects to daily triage",
      "Lock scope freeze for release 1 by July 15",
    ],
    weeklyChangeSummary:
      "Schedule risk +13 pts; SIT entry re-baselined to Aug 3; 14 conversion defects closed (9 remain); no budget change.",
    decisionNeeded: "Approve $180K contingency draw for extended SI test support.",
    podcastUrl: null,
    budget: 4200000,
    actualsToDate: 2480000,
    forecastAtCompletion: 4380000,
    sharePointUrl: "https://contoso.sharepoint.com/sites/project-alpha",
    powerBiReportUrl: "https://app.powerbi.com/groups/52cb886e-c058-4b2a-b4f0-078e32ed6985/reports/0a265639-75b5-43c4-b28e-02be285e0485/f17a90b2c3d4e5f60003?experience=power-bi",
  },
  {
    id: "phoenix",
    name: "Project Phoenix",
    code: "INF-004",
    portfolio: "Infrastructure Modernization",
    sponsor: "R. Alvarez (CIO)",
    projectManager: "T. Osei",
    phase: "Deploy",
    status: "Red",
    percentComplete: 78,
    startDate: "2025-04-15",
    endDate: "2026-08-31",
    healthScore: 41,
    scheduleRiskScore: 86,
    budgetRiskScore: 72,
    forecastCompletionDate: "2026-10-22",
    executiveSummary:
      "Project Phoenix is Red. The datacenter exit deadline is at risk after the network carrier missed two circuit delivery dates for the Dallas site. Forecast completion has moved to late October, seven weeks past the committed date, and dual-run costs are accruing at ~$95K/month.",
    riskNarrative:
      "Carrier circuit delivery is the critical path; each week of delay adds dual-run cost and compresses the migration freeze window before fiscal year-end. Contract remedies with the carrier are being evaluated.",
    recommendedActions: [
      "Trigger contractual penalty and escalate to carrier executive sponsor",
      "Approve alternate carrier quote for Dallas as a parallel path",
      "Re-sequence app migration waves 6-8 to non-Dallas sites",
    ],
    weeklyChangeSummary:
      "Circuit delivery missed again (2nd slip); forecast completion +3 weeks; dual-run cost forecast +$285K; wave 6 re-planned.",
    decisionNeeded: "Select alternate carrier for Dallas at +$140K, or accept 7-week delay.",
    podcastUrl: null,
    budget: 6800000,
    actualsToDate: 5590000,
    forecastAtCompletion: 7450000,
    sharePointUrl: "https://contoso.sharepoint.com/sites/project-phoenix",
    powerBiReportUrl: "https://app.powerbi.com/groups/52cb886e-c058-4b2a-b4f0-078e32ed6985/reports/0a265639-75b5-43c4-b28e-02be285e0485/f17a90b2c3d4e5f60006?experience=power-bi",
  },
  {
    id: "atlas",
    name: "Project Atlas",
    code: "DAT-002",
    portfolio: "Data & AI",
    sponsor: "K. Kramer (COO)",
    projectManager: "L. Novak",
    phase: "Build",
    status: "Green",
    percentComplete: 45,
    startDate: "2026-01-12",
    endDate: "2026-12-15",
    healthScore: 88,
    scheduleRiskScore: 22,
    budgetRiskScore: 18,
    forecastCompletionDate: "2026-12-10",
    executiveSummary:
      "Project Atlas (enterprise lakehouse on Microsoft Fabric) is on track at 45% complete. All Q2 milestones delivered on or ahead of baseline. Ingestion is live for 14 of 22 source systems; semantic model certification is scheduled for September.",
    riskNarrative:
      "Low risk overall. Watch item: SAP extractor licensing decision could delay the final two source systems if not resolved by August.",
    recommendedActions: [
      "Confirm SAP extractor licensing approach by Aug 1",
      "Begin early UAT with finance power users to de-risk certification",
    ],
    weeklyChangeSummary:
      "Two more sources ingested (14/22); semantic model draft KPIs reviewed with Finance; no risk changes.",
    decisionNeeded: null,
    podcastUrl: null,
    budget: 2900000,
    actualsToDate: 1190000,
    forecastAtCompletion: 2850000,
    sharePointUrl: "https://contoso.sharepoint.com/sites/project-atlas",
    powerBiReportUrl: "https://app.powerbi.com/groups/52cb886e-c058-4b2a-b4f0-078e32ed6985/reports/0a265639-75b5-43c4-b28e-02be285e0485/f17a90b2c3d4e5f60007?experience=power-bi",
  },
  {
    id: "sentinel",
    name: "Project Sentinel",
    code: "SEC-003",
    portfolio: "Cybersecurity",
    sponsor: "D. Iyer (CISO)",
    projectManager: "A. Brooks",
    phase: "Test",
    status: "Green",
    percentComplete: 82,
    startDate: "2025-11-03",
    endDate: "2026-09-15",
    healthScore: 91,
    scheduleRiskScore: 15,
    budgetRiskScore: 12,
    forecastCompletionDate: "2026-09-08",
    executiveSummary:
      "Project Sentinel (identity modernization and MFA rollout) is ahead of schedule at 82% complete. 94% of workforce migrated to phishing-resistant MFA. Final wave covers plant-floor shared accounts, with cutover planned for late August.",
    riskNarrative:
      "Residual risk concentrated in OT/plant-floor shared account patterns; mitigation via kiosk badge-tap authentication pilot is performing well.",
    recommendedActions: ["Approve badge-tap rollout to remaining three plants"],
    weeklyChangeSummary: "Wave 7 complete; helpdesk MFA tickets down 41% week-over-week.",
    decisionNeeded: null,
    podcastUrl: null,
    budget: 1800000,
    actualsToDate: 1420000,
    forecastAtCompletion: 1760000,
    sharePointUrl: "https://contoso.sharepoint.com/sites/project-sentinel",
    powerBiReportUrl: "https://app.powerbi.com/groups/6305583c-9f2c-4a40-a962-78952eaeee9a/reports/5d722bb0-a74d-4fe2-987b-e9077edd789b/49e4c6f63c7438c08aa1?experience=power-bi",
  },
  {
    id: "compass",
    name: "Project Compass",
    code: "HCM-005",
    portfolio: "ERP Transformation",
    sponsor: "J. Whitfield (CHRO)",
    projectManager: "P. Ruiz",
    phase: "Design",
    status: "Amber",
    percentComplete: 28,
    startDate: "2026-02-02",
    endDate: "2027-03-31",
    healthScore: 64,
    scheduleRiskScore: 55,
    budgetRiskScore: 38,
    forecastCompletionDate: "2027-04-20",
    executiveSummary:
      "Project Compass (workforce management modernization) is Amber in Design. Requirements sign-off for union scheduling rules is three weeks late, driven by open policy questions with Labor Relations. Design exit gate now forecast for Sept 12.",
    riskNarrative:
      "Union scheduling rule complexity is the dominant risk; unresolved policy decisions block configuration design and could cascade into the build estimate.",
    recommendedActions: [
      "Stand up weekly Labor Relations decision forum with executive sponsor",
      "Time-box remaining policy decisions to Aug 15 with default positions",
    ],
    weeklyChangeSummary:
      "6 of 11 open policy questions resolved; design exit re-forecast +3 weeks; vendor design resources partially reallocated.",
    decisionNeeded: "Ratify default positions for the 5 remaining scheduling policy questions.",
    podcastUrl: null,
    budget: 3600000,
    actualsToDate: 760000,
    forecastAtCompletion: 3720000,
    sharePointUrl: "https://contoso.sharepoint.com/sites/project-compass",
    powerBiReportUrl: "https://app.powerbi.com/groups/52cb886e-c058-4b2a-b4f0-078e32ed6985/reports/0a265639-75b5-43c4-b28e-02be285e0485/f17a90b2c3d4e5f60002?experience=power-bi",
  },
  {
    id: "beacon",
    name: "Project Beacon",
    code: "CX-006",
    portfolio: "Customer Experience",
    sponsor: "N. Fontaine (CRO)",
    projectManager: "H. Adeyemi",
    phase: "Deploy",
    status: "Green",
    percentComplete: 93,
    startDate: "2025-06-16",
    endDate: "2026-07-31",
    healthScore: 86,
    scheduleRiskScore: 20,
    budgetRiskScore: 25,
    forecastCompletionDate: "2026-07-29",
    executiveSummary:
      "Project Beacon (customer portal replatform) is in final deployment at 93% complete. Production cutover completed for 3 of 4 regions; NPS for migrated regions is +12 vs. legacy. Final region cutover July 25 with hypercare through August.",
    riskNarrative:
      "Low residual risk; the remaining region has the highest integration complexity (legacy EDI). Rollback plan tested successfully.",
    recommendedActions: ["Confirm hypercare staffing for EDI-heavy accounts through Aug 15"],
    weeklyChangeSummary: "Region 3 cutover complete; 2 Sev-3 defects in hypercare; NPS +12.",
    decisionNeeded: null,
    podcastUrl: null,
    budget: 2400000,
    actualsToDate: 2310000,
    forecastAtCompletion: 2460000,
    sharePointUrl: "https://contoso.sharepoint.com/sites/project-beacon",
    powerBiReportUrl: "https://app.powerbi.com/groups/52cb886e-c058-4b2a-b4f0-078e32ed6985/reports/0a265639-75b5-43c4-b28e-02be285e0485/f17a90b2c3d4e5f60008?experience=power-bi",
  },
];

export const demoRaid: RaidItem[] = [
  { id: "r1", projectId: "alpha", type: "Risk", title: "SIT entry slippage cascades into UAT and cutover window", severity: "High", owner: "M. Chen", dueDate: "2026-07-20", status: "Open" },
  { id: "r2", projectId: "alpha", type: "Issue", title: "9 open Sev-2 data conversion defects in finance workstream", severity: "High", owner: "SI Partner", dueDate: "2026-07-14", status: "In Progress" },
  { id: "r3", projectId: "alpha", type: "Decision", title: "Approve $180K contingency draw for extended SI test support", severity: "High", owner: "S. Grant", dueDate: "2026-07-10", status: "Overdue" },
  { id: "r4", projectId: "alpha", type: "Dependency", title: "Bank file format sign-off from Treasury", severity: "Medium", owner: "Treasury", dueDate: "2026-08-01", status: "Open" },
  { id: "r5", projectId: "phoenix", type: "Issue", title: "Carrier missed Dallas circuit delivery (2nd consecutive slip)", severity: "High", owner: "T. Osei", dueDate: "2026-07-08", status: "Overdue" },
  { id: "r6", projectId: "phoenix", type: "Decision", title: "Select alternate Dallas carrier (+$140K) vs. accept 7-week delay", severity: "High", owner: "R. Alvarez", dueDate: "2026-07-11", status: "Open" },
  { id: "r7", projectId: "phoenix", type: "Risk", title: "Dual-run costs accrue $95K/month during delay", severity: "High", owner: "Finance", dueDate: "2026-07-31", status: "Open" },
  { id: "r8", projectId: "phoenix", type: "Risk", title: "Migration freeze window compression before fiscal year-end", severity: "Medium", owner: "T. Osei", dueDate: "2026-09-01", status: "Open" },
  { id: "r9", projectId: "atlas", type: "Risk", title: "SAP extractor licensing unresolved for final 2 sources", severity: "Medium", owner: "L. Novak", dueDate: "2026-08-01", status: "Open" },
  { id: "r10", projectId: "compass", type: "Decision", title: "Ratify default positions on 5 remaining union scheduling policies", severity: "High", owner: "J. Whitfield", dueDate: "2026-08-15", status: "Open" },
  { id: "r11", projectId: "compass", type: "Risk", title: "Policy decision delays cascade into build estimate", severity: "Medium", owner: "P. Ruiz", dueDate: "2026-09-12", status: "Open" },
  { id: "r12", projectId: "sentinel", type: "Risk", title: "OT shared-account patterns on plant floor", severity: "Low", owner: "A. Brooks", dueDate: "2026-08-20", status: "In Progress" },
  { id: "r13", projectId: "beacon", type: "Risk", title: "Legacy EDI integration complexity in final region", severity: "Medium", owner: "H. Adeyemi", dueDate: "2026-07-25", status: "In Progress" },
];

export const demoMilestones: Milestone[] = [
  { id: "m1", projectId: "alpha", name: "Design Complete", baselineDate: "2026-02-27", forecastDate: "2026-02-27", status: "Complete" },
  { id: "m2", projectId: "alpha", name: "SIT Entry", baselineDate: "2026-07-20", forecastDate: "2026-08-03", status: "Late" },
  { id: "m3", projectId: "alpha", name: "UAT Complete", baselineDate: "2026-10-16", forecastDate: "2026-10-30", status: "At Risk" },
  { id: "m4", projectId: "alpha", name: "Go-Live", baselineDate: "2026-11-30", forecastDate: "2026-12-18", status: "At Risk" },
  { id: "m5", projectId: "phoenix", name: "Wave 5 Migration", baselineDate: "2026-06-15", forecastDate: "2026-06-19", status: "Complete" },
  { id: "m6", projectId: "phoenix", name: "Dallas Circuits Live", baselineDate: "2026-06-30", forecastDate: "2026-08-14", status: "Late" },
  { id: "m7", projectId: "phoenix", name: "Datacenter Exit", baselineDate: "2026-08-31", forecastDate: "2026-10-22", status: "Late" },
  { id: "m8", projectId: "atlas", name: "Lakehouse Foundation", baselineDate: "2026-04-30", forecastDate: "2026-04-24", status: "Complete" },
  { id: "m9", projectId: "atlas", name: "Semantic Model Certified", baselineDate: "2026-09-30", forecastDate: "2026-09-30", status: "On Track" },
  { id: "m10", projectId: "atlas", name: "All Sources Live", baselineDate: "2026-11-30", forecastDate: "2026-11-30", status: "On Track" },
  { id: "m11", projectId: "sentinel", name: "Workforce MFA Complete", baselineDate: "2026-06-30", forecastDate: "2026-06-22", status: "Complete" },
  { id: "m12", projectId: "sentinel", name: "Plant-Floor Cutover", baselineDate: "2026-08-28", forecastDate: "2026-08-28", status: "On Track" },
  { id: "m13", projectId: "compass", name: "Requirements Sign-off", baselineDate: "2026-06-19", forecastDate: "2026-07-24", status: "Late" },
  { id: "m14", projectId: "compass", name: "Design Exit Gate", baselineDate: "2026-08-21", forecastDate: "2026-09-12", status: "At Risk" },
  { id: "m15", projectId: "beacon", name: "Region 3 Cutover", baselineDate: "2026-06-27", forecastDate: "2026-06-27", status: "Complete" },
  { id: "m16", projectId: "beacon", name: "Final Region Cutover", baselineDate: "2026-07-25", forecastDate: "2026-07-25", status: "On Track" },
];

export const demoPortfolioSummary =
  "The portfolio of 6 active projects carries an executive health score of 73. Two projects require executive attention: Project Phoenix (Red) faces a 7-week datacenter exit delay driven by carrier circuit slips, with a carrier decision needed by July 11; Project Alpha (Amber) re-baselined SIT entry and needs a $180K contingency decision now overdue. Compass is Amber on late union policy decisions. Atlas, Sentinel, and Beacon are Green, with Sentinel tracking ahead of schedule. Portfolio spend is $13.75M against a $21.7M budget (63% of plan at 65% average completion).";

// Demo document snippets — stands in for Onyx document intelligence results.
export const demoDocuments: { projectId: string; doc: string; snippet: string }[] = [
  {
    projectId: "phoenix",
    doc: "Phoenix Charter v2.1.docx",
    snippet:
      "Scope includes exit of the Dallas and Tulsa datacenters by August 31, 2026. Network circuit procurement for Dallas is on the critical path and owned by the carrier under SLA 14-B, which provides for delay penalties of $12K/week after a 10-day grace period.",
  },
  {
    projectId: "phoenix",
    doc: "Phoenix SteerCo Minutes 2026-06-24.docx",
    snippet:
      "SteerCo noted the first carrier slip and requested a parallel-path quote from an alternate carrier. Action: T. Osei to present alternate carrier option and penalty position at next SteerCo.",
  },
  {
    projectId: "alpha",
    doc: "Alpha Charter v1.0.docx",
    snippet:
      "In-scope: General Ledger, AP, AR, Fixed Assets, and Treasury payments. Out of scope: consolidation reporting (retained in legacy through FY27). Cutover contingency of $250K is held at the program level.",
  },
  {
    projectId: "compass",
    doc: "Compass Requirements Workshop Notes.docx",
    snippet:
      "Union scheduling rules vary by local agreement; 11 policy questions were raised requiring Labor Relations rulings before design can be finalized.",
  },
];
