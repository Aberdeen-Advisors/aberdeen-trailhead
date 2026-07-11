// Central mode + capability detection. With no env vars set, everything is demo.

export const isLiveMode = (): boolean =>
  process.env.HV_MODE === "live" &&
  !!process.env.AUTH_MICROSOFT_ENTRA_ID_ID;

export const isDemoMode = (): boolean => !isLiveMode();

export const hasPowerBi = (): boolean =>
  !!(process.env.POWERBI_CLIENT_ID && process.env.POWERBI_DATASET_ID);

export const hasGraph = (): boolean =>
  !!(process.env.GRAPH_CLIENT_ID && process.env.SHAREPOINT_SITE_ID);

export const hasAi = (): boolean =>
  !!(process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY);

export const hasOnyx = (): boolean =>
  !!(process.env.ONYX_BASE_URL && process.env.ONYX_API_KEY);

// ── HorizonView tiers ─────────────────────────────────────────────────────────
// core         → portal, dashboards, SharePoint links
// intelligence → + AI insights, Ask Horizon, one-click PPTX
// executive    → + podcast updates, scheduled AI reports
export type HvTier = "core" | "intelligence" | "executive";

export function hvTier(): HvTier {
  if (isDemoMode()) return "executive"; // demo shows everything
  const t = process.env.HV_TIER;
  return t === "core" || t === "executive" ? t : "intelligence";
}

export const tierHasAiFeatures = (): boolean => hvTier() !== "core";
export const tierHasPodcasts = (): boolean => hvTier() === "executive";

export function powerBiReportLinks(): { name: string; url: string }[] {
  const raw = process.env.POWERBI_REPORT_LINKS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((pair) => {
      const [name, url] = pair.split("|");
      return { name: name?.trim() ?? "", url: url?.trim() ?? "" };
    })
    .filter((l) => l.name && l.url);
}
