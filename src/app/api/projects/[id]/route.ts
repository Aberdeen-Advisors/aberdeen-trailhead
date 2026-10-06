import { NextResponse } from "next/server";
import { getSessionUser } from "@/auth";
import { hasSupabase, sbSelect, sbUpdate } from "@/lib/supabase";
import { invalidateRegistry, isDbProject } from "@/lib/registry";
import { checkProject, type ProjectInput } from "@/lib/project-fields";

export const dynamic = "force-dynamic";

// Edit a HorizonView project's details, or archive it (archived projects drop
// off the portfolio but keep all their data and history). Requires sign-in.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "The project database is not configured for this site." }, { status: 503 });
  if (!(await isDbProject(params.id))) return NextResponse.json({ error: "Unknown project" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as ProjectInput & { archived?: boolean };
  const checked = checkProject(body, true);
  if ("error" in checked) return NextResponse.json({ error: checked.error }, { status: 400 });
  // When only one date changes, check it against the date already saved.
  if (("start_date" in checked.value) !== ("end_date" in checked.value)) {
    const [cur] = await sbSelect("projects", `id=eq.${encodeURIComponent(params.id)}&select=start_date,end_date`);
    const start = String(checked.value.start_date ?? cur?.start_date ?? "");
    const end = String(checked.value.end_date ?? cur?.end_date ?? "");
    if (start && end && end < start) return NextResponse.json({ error: "Target finish must be on or after the start date." }, { status: 400 });
  }
  const patch: Record<string, unknown> = { ...checked.value, updated_by: user.email || user.name };
  if (body.archived === true) patch.archived = true;
  if (Object.keys(patch).length === 1) return NextResponse.json({ error: "Nothing to change." }, { status: 400 });

  try {
    await sbUpdate("projects", `id=eq.${encodeURIComponent(params.id)}`, patch);
    invalidateRegistry();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[projects] update failed", e);
    const msg = String((e as Error).message ?? "");
    return NextResponse.json(
      { error: msg.includes("check") ? "One of the values isn't allowed. Please check the dates and budget." : "Could not save the project. Please try again." },
      { status: 502 },
    );
  }
}
