// Which client tech stack each project runs on. HorizonView works with the
// client's existing tools; the portal shows this as a logo strip on each card.
// Logos are optional image files in public/stack-logos/<key>.png (or .svg).
// Until a file exists, a small text label is shown instead.

export type StackKey = "sharepoint" | "lists" | "fabric" | "powerbi" | "snowflake" | "supabase" | "htmldash" | "entra";

export const STACK_LABELS: Record<StackKey, string> = {
  sharepoint: "SharePoint",
  lists: "SharePoint Lists",
  fabric: "Microsoft Fabric",
  powerbi: "Power BI",
  snowflake: "Snowflake",
  supabase: "Supabase",
  htmldash: "HTML dashboards",
  entra: "Microsoft 365 Security",
};

// Optional hover text per project + stack item, to explain what's behind it.
const STACK_DETAILS: Record<string, Partial<Record<StackKey, string>>> = {
  elevate: {
    sharepoint: "Project home site: aberdeenadv.sharepoint.com/sites/elevate",
    lists: "Weekly Status Updates · Weekly Accomplishments & Next Steps · RAID Log · Interdependencies · Governance Key Dictionary",
    fabric: "Lists land in Fabric and feed the HorizonView semantic model",
    powerbi: "HorizonView semantic model and Power BI reports",
  },
  alpha: {
    supabase: "Postgres database, hosted by Supabase. Project tables (plan, milestones, RAID, weekly status, dependencies) are edited directly in HorizonView",
    htmldash: "Interactive HTML dashboard built on the Supabase data",
    entra: "Sign-in and access control through your Microsoft 365 tenant (Entra ID single sign-on, with your MFA and conditional access policies). No SharePoint, Power BI or Fabric behind this project",
  },
};

export function stackDetail(projectId: string, key: StackKey): string | undefined {
  return STACK_DETAILS[projectId]?.[key];
}

const PROJECT_STACKS: Record<string, StackKey[]> = {
  elevate: ["sharepoint", "lists", "fabric", "powerbi"],
  alpha: ["supabase", "htmldash", "entra"],
};

export function stackFor(projectId: string): StackKey[] {
  return PROJECT_STACKS[projectId] ?? [];
}

// Built-in HTML dashboards (static pages in public/dashboards/), per project.
const PROJECT_DASHBOARDS: Record<string, string> = {
  alpha: "/dashboards/alpha.html",
};

export function dashboardFor(projectId: string): string | null {
  return PROJECT_DASHBOARDS[projectId] ?? null;
}

// Projects whose stack is Microsoft show SharePoint / Power BI links.
export function usesMicrosoftStack(projectId: string): boolean {
  const s = stackFor(projectId);
  return s.length === 0 || s.some((k) => k === "sharepoint" || k === "powerbi" || k === "fabric");
}

// Projects whose data lives in Supabase and is edited inside HorizonView.
export function supabaseProjectIds(): string[] {
  return Object.keys(PROJECT_STACKS).filter((id) => PROJECT_STACKS[id].includes("supabase"));
}
export const usesSupabase = (projectId: string): boolean => stackFor(projectId).includes("supabase");
