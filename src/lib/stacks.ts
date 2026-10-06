// Which client tech stack each project runs on. HorizonView works with the
// client's existing tools; the portal shows this as a logo strip on each card.
// Logos are optional image files in public/stack-logos/<key>.png (or .svg).
// Until a file exists, a small text label is shown instead.
//
// Projects kept in the HorizonView database carry their own stack list (the
// projects.stack column); the fixed entries below cover the Microsoft 365 demo.

import type { Project } from "@/lib/types";

export type StackKey = "sharepoint" | "lists" | "fabric" | "powerbi" | "snowflake" | "supabase" | "htmldash" | "entra" | "demodata" | "customppt";

export const STACK_LABELS: Record<StackKey, string> = {
  sharepoint: "SharePoint",
  lists: "SharePoint Lists",
  fabric: "Microsoft Fabric",
  powerbi: "Power BI",
  snowflake: "Snowflake",
  supabase: "Supabase",
  htmldash: "HTML dashboards",
  entra: "Microsoft 365 Security",
  demodata: "Demo Data",
  customppt: "Custom PPT Creation",
};

// Hover text for projects kept in the HorizonView database.
const DATABASE_DETAILS: Partial<Record<StackKey, string>> = {
  supabase: "Postgres database, hosted by Supabase. Project tables (plan, milestones, RAID, weekly status, dependencies) are edited directly in HorizonView",
  htmldash: "Interactive HTML dashboard built on the project's live data",
  entra: "Sign-in and access control through your Microsoft 365 tenant (Entra ID single sign-on, with your MFA and conditional access policies). No SharePoint, Power BI or Fabric behind this project",
};

// Optional hover text per fixed project + stack item.
const STACK_DETAILS: Record<string, Partial<Record<StackKey, string>>> = {
  elevate: {
    sharepoint: "Project home site: aberdeenadv.sharepoint.com/sites/elevate",
    lists: "Weekly Status Updates · Weekly Accomplishments & Next Steps · RAID Log · Interdependencies · Governance Key Dictionary",
    fabric: "Lists land in Fabric and feed the HorizonView semantic model",
    powerbi: "HorizonView semantic model and Power BI reports",
  },
  phoenix: {
    demodata: "Sample project data built into HorizonView for demonstrations",
    customppt: "Executive Dashboard generated in the client's own PowerPoint template, filled from the project data on each click",
  },
};

const FIXED_STACKS: Record<string, StackKey[]> = {
  elevate: ["sharepoint", "lists", "fabric", "powerbi"],
  phoenix: ["demodata", "customppt"],
};

const isKey = (k: string): k is StackKey => k in STACK_LABELS;

/** The project's "Runs on" list. */
export function stackOf(p: Pick<Project, "id" | "stack" | "source">): StackKey[] {
  if (p.stack?.length) return p.stack.filter(isKey);
  return FIXED_STACKS[p.id] ?? [];
}

export function stackDetail(p: Pick<Project, "id" | "source">, key: StackKey): string | undefined {
  return p.source === "database" ? DATABASE_DETAILS[key] : STACK_DETAILS[p.id]?.[key];
}

/** Fixed stack for projects that are not in the database (used by the provider). */
export function fixedStackFor(projectId: string): StackKey[] {
  return FIXED_STACKS[projectId] ?? [];
}

/** Live HTML dashboard for projects kept in HorizonView. */
export function dashboardFor(p: Pick<Project, "id" | "source">): string | null {
  return p.source === "database" ? `/dashboards/project.html?id=${encodeURIComponent(p.id)}` : null;
}

/** Projects on the Microsoft stack (and the demo samples) show SharePoint / Power BI links. */
export function usesMicrosoftStack(p: Pick<Project, "id" | "stack" | "source">): boolean {
  if (p.source === "database") return false;
  const s = stackOf(p);
  return s.length === 0 || s.some((k) => k === "sharepoint" || k === "powerbi" || k === "fabric");
}

/** Project is created and edited inside HorizonView (its tables live in the database). */
export const isDatabaseProject = (p: Pick<Project, "source"> | undefined | null): boolean => p?.source === "database";

/** Project has an Executive Dashboard built from the client's own PowerPoint template. */
export const hasClientTemplate = (p: Pick<Project, "id" | "stack" | "source">): boolean => stackOf(p).includes("customppt");

export type DashboardKind = "powerbi" | "html" | "internal";

/** Where a project's dashboard lives: Power BI for the Microsoft stack, the live
 * HTML dashboard for projects kept in HorizonView, and a built-in HorizonView
 * dashboard for the sample projects. */
export function projectDashboard(
  p: Pick<Project, "id" | "stack" | "source" | "powerBiReportUrl">,
): { href: string; kind: DashboardKind; label: string } {
  if (stackOf(p).includes("powerbi") && p.powerBiReportUrl) return { href: p.powerBiReportUrl, kind: "powerbi", label: "Power BI report" };
  const html = dashboardFor(p);
  if (html) return { href: html, kind: "html", label: "Live HTML dashboard" };
  return { href: `/portal/dashboards/${encodeURIComponent(p.id)}`, kind: "internal", label: "HorizonView dashboard" };
}
