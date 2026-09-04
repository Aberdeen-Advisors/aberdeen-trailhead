import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RaidItem, RaidType } from "@/lib/types";

// ── Editable RAID overlay (demo mode) ────────────────────────────────────────
// Demo RAID lives in a static module (demo-data.ts), so edits made in the portal
// are held here as an overlay on top of it: rows added, fields patched, rows
// removed. getRaid() in provider.ts applies it, which means an edit shows up
// everywhere at once — the project page, portfolio decisions, and the generated
// SteerCo decks.
//
// Durability: the overlay is kept in memory and mirrored to a JSON file beside
// the project so it survives a dev-server restart. On a read-only filesystem
// (e.g. a Vercel serverless function) the write is skipped and the overlay is
// per-instance and lost on cold start — acceptable for demo mode, which is the
// only mode where editing is offered. Live mode reads SharePoint/Power BI and is
// read-only until a Graph write-back is implemented.

const FILE = path.join(process.cwd(), ".raid-overrides.json");

export interface RaidOverlay {
  created: RaidItem[];
  patched: Record<string, Partial<RaidItem>>;
  deleted: string[];
}

const empty = (): RaidOverlay => ({ created: [], patched: {}, deleted: [] });

let overlay: RaidOverlay | null = null;
/** mtime the cached overlay was read at; -1 when nothing is cached. */
let loadedMtime = -1;
/** Serialises file writes so concurrent edits cannot interleave. */
let writeQueue: Promise<unknown> = Promise.resolve();

const mtimeOf = async (): Promise<number> => {
  try {
    return (await stat(FILE)).mtimeMs;
  } catch {
    return 0; // no file yet
  }
};

/**
 * Load the overlay, re-reading whenever the file has changed underneath us.
 * The mtime check matters: Next.js bundles route handlers and server components
 * separately, so the writer and the reader can be distinct module instances. A
 * cache that never invalidated would serve one of them stale forever.
 */
async function load(): Promise<RaidOverlay> {
  const mtime = await mtimeOf();
  if (overlay && mtime === loadedMtime) return overlay;
  const fresh = await readFile(FILE, "utf8")
    .then((raw) => {
      const parsed = JSON.parse(raw) as Partial<RaidOverlay>;
      return {
        created: Array.isArray(parsed.created) ? parsed.created : [],
        patched: parsed.patched && typeof parsed.patched === "object" ? parsed.patched : {},
        deleted: Array.isArray(parsed.deleted) ? parsed.deleted : [],
      };
    })
    .catch(() => empty());
  overlay = fresh;
  loadedMtime = mtime;
  return fresh;
}

/**
 * Write the overlay and adopt the new mtime, so the next load() keeps the
 * in-memory copy rather than re-reading. Resolves once durable; callers await it
 * so an API response never returns ahead of the write.
 */
function persist(o: RaidOverlay): Promise<void> {
  writeQueue = writeQueue
    .then(async () => {
      await writeFile(FILE, JSON.stringify(o, null, 2), "utf8");
      overlay = o;
      loadedMtime = await mtimeOf();
    })
    .catch(() => {
      // Read-only filesystem (e.g. serverless): keep the in-memory overlay and
      // give up durability rather than failing the edit.
      overlay = o;
    });
  return writeQueue as Promise<void>;
}

/** Apply the overlay to the base list: patches, then removals, then additions. */
export async function applyRaidOverlay(base: RaidItem[]): Promise<RaidItem[]> {
  const o = await load();
  if (!o.created.length && !o.deleted.length && !Object.keys(o.patched).length) return base;
  const deleted = new Set(o.deleted);
  const kept = base
    .filter((r) => !deleted.has(r.id))
    .map((r) => (o.patched[r.id] ? { ...r, ...o.patched[r.id] } : r));
  return [...kept, ...o.created.filter((r) => !deleted.has(r.id))];
}

// ── Validation ───────────────────────────────────────────────────────────────
// Everything below crosses the API boundary, so each field is narrowed to the
// union in lib/types rather than trusted.

const TYPES: RaidType[] = ["Risk", "Assumption", "Issue", "Dependency", "Decision"];
const SEVERITIES: RaidItem["severity"][] = ["High", "Medium", "Low"];
const STATUSES: RaidItem["status"][] = ["Open", "In Progress", "Closed", "Overdue"];

const str = (v: unknown, max: number): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;

const isoDate = (v: unknown): string | undefined =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;

/** Narrow an arbitrary payload to the fields a caller may change. */
export function sanitizePatch(input: unknown): Partial<RaidItem> {
  const body = (input ?? {}) as Record<string, unknown>;
  const patch: Partial<RaidItem> = {};
  const title = str(body.title, 300);
  if (title) patch.title = title;
  const owner = str(body.owner, 80);
  if (owner) patch.owner = owner;
  const due = isoDate(body.dueDate);
  if (due) patch.dueDate = due;
  if (TYPES.includes(body.type as RaidType)) patch.type = body.type as RaidType;
  if (SEVERITIES.includes(body.severity as RaidItem["severity"]))
    patch.severity = body.severity as RaidItem["severity"];
  if (STATUSES.includes(body.status as RaidItem["status"]))
    patch.status = body.status as RaidItem["status"];
  return patch;
}

// Typed, readable IDs — the convention in the client's status report (RSK-241,
// ISS-118, DEC-052). These land in generated decks, so a random hash would read
// badly there. Numbering starts at 501 to stay clear of the shipped demo rows.
const ID_PREFIX: Record<RaidType, string> = {
  Risk: "RSK",
  Assumption: "ASM",
  Issue: "ISS",
  Dependency: "DEP",
  Decision: "DEC",
};

function newId(o: RaidOverlay, type: RaidType): string {
  const taken = new Set(o.created.map((r) => r.id));
  let n = 501 + o.created.length;
  let id = `${ID_PREFIX[type]}-${n}`;
  while (taken.has(id)) id = `${ID_PREFIX[type]}-${++n}`;
  return id;
}

export async function createRaid(projectId: string, input: unknown): Promise<RaidItem> {
  const o = await load();
  const patch = sanitizePatch(input);
  const type = patch.type ?? "Risk";
  const item: RaidItem = {
    id: newId(o, type),
    projectId,
    type,
    title: patch.title ?? "New RAID item",
    severity: patch.severity ?? "Medium",
    owner: patch.owner ?? "Unassigned",
    dueDate: patch.dueDate ?? new Date().toISOString().slice(0, 10),
    status: patch.status ?? "Open",
  };
  o.created.push(item);
  await persist(o);
  return item;
}

/** Patch an item, whether it came from demo data or was created here. */
export async function updateRaid(id: string, input: unknown): Promise<Partial<RaidItem>> {
  const o = await load();
  const patch = sanitizePatch(input);
  if (!Object.keys(patch).length) return {};
  const own = o.created.find((r) => r.id === id);
  if (own) {
    Object.assign(own, patch);
  } else {
    o.patched[id] = { ...o.patched[id], ...patch };
  }
  await persist(o);
  return patch;
}

export async function deleteRaid(id: string): Promise<void> {
  const o = await load();
  const before = o.created.length;
  o.created = o.created.filter((r) => r.id !== id);
  // Base-data rows are not in `created`, so record a tombstone instead.
  if (o.created.length === before && !o.deleted.includes(id)) o.deleted.push(id);
  delete o.patched[id];
  await persist(o);
}

/** Drop every edit — useful for resetting between demo runs. */
export async function resetRaid(): Promise<void> {
  await persist(empty());
}
