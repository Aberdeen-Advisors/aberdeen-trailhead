import { hasSupabase, sbSelect } from "@/lib/supabase";

// The list of projects kept in the HorizonView database (created with
// "+ New project" or seeded). Read once and cached for a few seconds so a page
// that asks several times only queries once; creating or editing a project
// clears the cache straight away on this server.

type Row = Record<string, any>;
let cache: { at: number; rows: Row[] } | null = null;
const TTL_MS = 5_000;

export function invalidateRegistry(): void {
  cache = null;
}

/** Active (not archived) database projects, oldest first. */
export async function dbProjects(): Promise<Row[]> {
  if (!hasSupabase()) return [];
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows;
  try {
    const rows = await sbSelect("projects", "archived=is.false&order=created_at.asc");
    cache = { at: Date.now(), rows };
    return rows;
  } catch (e) {
    console.error("[registry] could not read projects", e);
    return cache?.rows ?? [];
  }
}

export async function dbProjectIds(): Promise<string[]> {
  return (await dbProjects()).map((r) => String(r.id));
}

export async function isDbProject(id: string | null | undefined): Promise<boolean> {
  return !!id && (await dbProjectIds()).includes(id);
}
