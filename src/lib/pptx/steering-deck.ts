import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPortfolioKpis, getProjects, getRaid, getMilestones } from "@/lib/data/provider";
import { buildDeck } from "@/lib/pptx/report-deck";

// One-click Steering Committee deck. Gathers the portal's own data and hands it
// to the deck builder, which lays it out in the Aberdeen deck design system
// (see src/lib/pptx/brand.ts).

/**
 * Read a public/ image as a data URI for embedding. Returns undefined rather
 * than throwing — the cover degrades gracefully and a deck is never lost to a
 * missing asset.
 */
async function asset(name: string): Promise<string | undefined> {
  try {
    const buf = await readFile(path.join(process.cwd(), "public", name));
    return `image/png;base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export async function buildSteeringDeck(projectId?: string): Promise<Buffer> {
  const [kpis, projects, raid, milestones, logo, cover, mark] = await Promise.all([
    getPortfolioKpis(),
    getProjects(),
    getRaid(),
    getMilestones(),
    asset("horizonview-logo-white.png"),
    asset("deck-cover.png"),
    // Aberdeen wordmark for the content-slide footer, as the slide master places it.
    asset("assets/aberdeen-logo.png"),
  ]);

  return buildDeck({ projects, raid, milestones, kpis, singleProjectId: projectId, logo, cover, mark });
}
