import { NextResponse } from "next/server";
import { getSessionUser } from "@/auth";
import { hasSupabase, sbDelete, sbInsert, sbSelect, sbUpdate } from "@/lib/supabase";
import { tableDef, type TableDef } from "@/lib/project-tables";
import { supabaseProjectIds } from "@/lib/stacks";

export const dynamic = "force-dynamic";

// Editable project tables (Supabase). Every request must be signed in, may only
// touch tables/columns declared in lib/project-tables.ts, and is scoped to one
// Supabase-backed project. The user's email is recorded on every change.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

async function guard(table: string, project: string | null) {
  const user = await getSessionUser();
  if (!user) return { error: bad("Unauthorized", 401) };
  if (!hasSupabase()) return { error: bad("Supabase is not configured for this instance.", 503) };
  const def = tableDef(table);
  if (!def) return { error: bad("Unknown table", 404) };
  if (!project || !supabaseProjectIds().includes(project)) return { error: bad("Unknown project", 404) };
  return { user, def, project };
}

/** Keep only declared, writable columns, and check each value's type. */
function clean(def: TableDef, input: Record<string, unknown>): Record<string, unknown> | string {
  const out: Record<string, unknown> = {};
  for (const col of def.columns) {
    if (col.readOnly || !(col.key in input)) continue;
    let v = input[col.key];
    if (v === "" || v === undefined) v = null;
    if (v === null) {
      if (col.required) return `${col.label} is required`;
      out[col.key] = null;
      continue;
    }
    switch (col.type) {
      case "text":
      case "title":
      case "longtext":
        if (typeof v !== "string") return `${col.label} must be text`;
        out[col.key] = v.trim().slice(0, col.type === "longtext" ? 4000 : 300);
        break;
      case "select":
        if (!col.options?.includes(String(v))) return `${col.label} has an invalid value`;
        out[col.key] = v;
        break;
      case "date":
        if (typeof v !== "string" || !DATE.test(v)) return `${col.label} must be a date`;
        out[col.key] = v;
        break;
      case "bool":
        out[col.key] = v === true || v === "true";
        break;
      case "int": {
        const n = Number(v);
        if (!Number.isInteger(n) || n < 0 || n > 1000) return `${col.label} must be a whole number`;
        out[col.key] = n;
        break;
      }
      case "workstream":
        if (typeof v !== "string" || !UUID.test(v)) return `${col.label} is invalid`;
        out[col.key] = v;
        break;
    }
  }
  return out;
}

/** Turn database rule violations into a message a user can act on. */
function saveError(e: unknown, fallback: string) {
  const msg = e instanceof Error ? e.message : "";
  if (msg.includes("activities_dates_check")) return bad("Start date must be on or before the finish date.");
  if (msg.includes("pct_complete")) return bad("% done must be between 0 and 100.");
  if (msg.includes("violates check constraint")) return bad("That value isn't allowed here.");
  if (msg.includes("violates unique constraint")) return bad("That name is already used in this project.");
  return bad(fallback, 502);
}

export async function GET(req: Request, { params }: { params: { table: string } }) {
  const project = new URL(req.url).searchParams.get("project");
  const g = await guard(params.table, project);
  if ("error" in g) return g.error;
  try {
    const rows = await sbSelect(g.def.key, `project_id=eq.${encodeURIComponent(g.project)}&order=${g.def.order}`);
    return NextResponse.json({ rows });
  } catch (e) {
    console.error("[data] read failed", e);
    return bad("Could not load data", 502);
  }
}

export async function POST(req: Request, { params }: { params: { table: string } }) {
  const body = (await req.json().catch(() => ({}))) as { project?: string; row?: Record<string, unknown> };
  const g = await guard(params.table, body.project ?? null);
  if ("error" in g) return g.error;
  const defaults: Record<string, unknown> = { ...g.def.defaults };
  if (g.def.key === "status_updates") {
    // New weekly status rows default to this week's Monday.
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    defaults.week_of = d.toISOString().slice(0, 10);
  }
  const row = clean(g.def, { ...defaults, ...(body.row ?? {}) });
  if (typeof row === "string") return bad(row);
  const who = g.user.email || g.user.name;
  const extra: Record<string, unknown> = g.def.key === "workstreams" ? { updated_by: who } : { created_by: who, updated_by: who };
  try {
    const created = await sbInsert(g.def.key, { ...row, ...extra, project_id: g.project });
    return NextResponse.json({ row: created }, { status: 201 });
  } catch (e) {
    console.error("[data] insert failed", e);
    return saveError(e, "Could not save the new row");
  }
}

export async function PATCH(req: Request, { params }: { params: { table: string } }) {
  const body = (await req.json().catch(() => ({}))) as { project?: string; id?: string; patch?: Record<string, unknown> };
  const g = await guard(params.table, body.project ?? null);
  if ("error" in g) return g.error;
  if (!body.id || !UUID.test(body.id)) return bad("Invalid id");
  const patch = clean(g.def, body.patch ?? {});
  if (typeof patch === "string") return bad(patch);
  if (!Object.keys(patch).length) return bad("Nothing to update");
  try {
    const updated = await sbUpdate(
      g.def.key,
      `id=eq.${body.id}&project_id=eq.${encodeURIComponent(g.project)}`,
      { ...patch, updated_by: g.user.email || g.user.name }
    );
    if (!updated) return bad("Row not found", 404);
    return NextResponse.json({ row: updated });
  } catch (e) {
    console.error("[data] update failed", e);
    return saveError(e, "Could not save the change");
  }
}

export async function DELETE(req: Request, { params }: { params: { table: string } }) {
  const url = new URL(req.url);
  const g = await guard(params.table, url.searchParams.get("project"));
  if ("error" in g) return g.error;
  const id = url.searchParams.get("id");
  if (!id || !UUID.test(id)) return bad("Invalid id");
  try {
    // Stamp who deleted it so the change log records the user, then delete.
    await sbUpdate(g.def.key, `id=eq.${id}&project_id=eq.${encodeURIComponent(g.project)}`, { updated_by: g.user.email || g.user.name });
    await sbDelete(g.def.key, `id=eq.${id}&project_id=eq.${encodeURIComponent(g.project)}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[data] delete failed", e);
    return bad("Could not delete the row", 502);
  }
}
