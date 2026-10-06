// Editable project tables stored in Supabase. Shared by the browser grid and the
// server API, so the server only ever accepts the tables, columns and choice
// values listed here.

export type ColType = "text" | "title" | "longtext" | "select" | "date" | "bool" | "workstream" | "int";

export interface ColDef {
  key: string;
  label: string;
  type: ColType;
  options?: string[];
  width?: number; // relative column width
  required?: boolean;
  readOnly?: boolean;
}

export interface TableDef {
  key: string;            // Supabase table name
  label: string;          // tab label
  description: string;
  order: string;          // PostgREST order clause
  columns: ColDef[];
  defaults: Record<string, unknown>;
  searchKeys: string[];
}

const RAG = ["On Track", "At Risk", "Off Track", "Not Started"];

export const PROJECT_TABLES: TableDef[] = [
  {
    key: "status_updates",
    label: "Weekly Status",
    description: "Internal and external status by workstream, each week. A row with no workstream is the project-level status.",
    order: "week_of.desc,created_at.asc",
    searchKeys: ["owner", "internal_summary", "external_summary"],
    defaults: { internal_status: "On Track", external_status: "On Track" },
    columns: [
      { key: "week_of", label: "Week of", type: "date", width: 1.45, required: true },
      { key: "workstream_id", label: "Workstream", type: "workstream", width: 1.6 },
      { key: "owner", label: "Owner", type: "text", width: 1.1 },
      { key: "internal_status", label: "Internal status", type: "select", options: RAG, width: 1.1 },
      { key: "internal_summary", label: "Internal executive summary", type: "longtext", width: 2.6 },
      { key: "external_status", label: "External status", type: "select", options: RAG, width: 1.1 },
      { key: "external_summary", label: "External executive summary", type: "longtext", width: 2.6 },
    ],
  },
  {
    key: "activities",
    label: "Tasks & Activities",
    description: "The project plan: tasks with a start and finish, plus accomplishments, next steps and deliverables. These are the bars on the Gantt chart.",
    order: "start_date.asc.nullslast,target_date.asc.nullslast,created_at.asc",
    searchKeys: ["title", "owner", "comments"],
    defaults: { update_type: "Task", status: "Not Started", title: "New task", pct_complete: 0 },
    columns: [
      { key: "update_type", label: "Type", type: "select", options: ["Task", "Deliverable", "Next Step", "Accomplishment"], width: 1.4 },
      { key: "title", label: "Task / activity", type: "title", width: 2.8, required: true },
      { key: "workstream_id", label: "Workstream", type: "workstream", width: 1.6 },
      { key: "status", label: "Status", type: "select", options: ["Not Started", "In Progress", "At Risk", "Off Track", "Closed"], width: 1.4 },
      { key: "owner", label: "Owner", type: "text", width: 1.3 },
      { key: "start_date", label: "Start", type: "date", width: 1.45 },
      { key: "target_date", label: "Finish", type: "date", width: 1.45 },
      { key: "pct_complete", label: "% done", type: "int", width: 0.8 },
      { key: "comments", label: "Comments / next steps", type: "longtext", width: 2.2 },
      { key: "exclude_from_report", label: "Hide from report", type: "bool", width: 0.8 },
    ],
  },
  {
    key: "milestones",
    label: "Milestones",
    description: "Key dates, shown as diamonds on the Gantt chart. Each milestone has a single date.",
    order: "forecast_date.asc.nullslast",
    searchKeys: ["name", "owner"],
    defaults: { status: "On Track", name: "New milestone" },
    columns: [
      { key: "name", label: "Milestone", type: "title", width: 2.8, required: true },
      { key: "workstream_id", label: "Workstream", type: "workstream", width: 1.6 },
      { key: "owner", label: "Owner", type: "text", width: 1.3 },
      { key: "forecast_date", label: "Date", type: "date", width: 1.45 },
      { key: "status", label: "Status", type: "select", options: ["Complete", "On Track", "At Risk", "Late"], width: 1.3 },
    ],
  },
  {
    key: "raid_items",
    label: "RAID Log",
    description: "Risks, actions, issues, decisions, assumptions and dependencies. IDs are assigned automatically.",
    order: "created_at.asc",
    searchKeys: ["ref", "title", "owner", "description"],
    defaults: { raid_type: "Risk", priority: "Medium", status: "Open", title: "New item" },
    columns: [
      { key: "ref", label: "ID", type: "text", width: 0.7, readOnly: true },
      { key: "raid_type", label: "Type", type: "select", options: ["Risk", "Action", "Issue", "Decision", "Assumption", "Dependency"], width: 1 },
      { key: "title", label: "Title", type: "title", width: 2.8, required: true },
      { key: "priority", label: "Priority", type: "select", options: ["Critical", "High", "Medium", "Low"], width: 0.9 },
      { key: "status", label: "Status", type: "select", options: ["Open", "In Progress", "Blocked", "Overdue", "Closed"], width: 1 },
      { key: "workstream_id", label: "Workstream", type: "workstream", width: 1.6 },
      { key: "owner", label: "Owner", type: "text", width: 1.1 },
      { key: "due_date", label: "Due", type: "date", width: 1.45 },
      { key: "solution_summary", label: "Solution / notes", type: "longtext", width: 2 },
    ],
  },
  {
    key: "interdependencies",
    label: "Interdependencies",
    description: "Hand-offs between workstreams.",
    order: "due_date.asc.nullslast",
    searchKeys: ["ref", "title", "provider_owner", "receiver_owner"],
    defaults: { status: "Not Started", title: "New dependency" },
    columns: [
      { key: "ref", label: "ID", type: "text", width: 0.8, readOnly: true },
      { key: "title", label: "Title", type: "title", width: 2.8, required: true },
      { key: "status", label: "Status", type: "select", options: ["Not Started", "In Progress", "At Risk", "Completed", "Canceled"], width: 1.1 },
      { key: "due_date", label: "Due", type: "date", width: 1.45 },
      { key: "provider_workstream_id", label: "Provider", type: "workstream", width: 1.6 },
      { key: "receiver_workstream_id", label: "Receiver", type: "workstream", width: 1.6 },
      { key: "provider_owner", label: "Provider owner", type: "text", width: 1.1 },
      { key: "receiver_owner", label: "Receiver owner", type: "text", width: 1.1 },
    ],
  },
  {
    key: "workstreams",
    label: "Workstreams",
    description: "The workstream list every other table picks from. Progress, plan and health per workstream are calculated from the tasks and milestones in each one.",
    order: "sort_order.asc,name.asc",
    searchKeys: ["name", "code", "lead"],
    defaults: { name: "New workstream", sort_order: 99 },
    columns: [
      { key: "code", label: "Code", type: "text", width: 0.8 },
      { key: "name", label: "Workstream", type: "text", width: 1.8, required: true },
      { key: "lead", label: "Lead", type: "text", width: 1.3 },
      { key: "sort_order", label: "Order", type: "int", width: 0.7 },
    ],
  },
];

export const tableDef = (key: string): TableDef | undefined => PROJECT_TABLES.find((t) => t.key === key);
