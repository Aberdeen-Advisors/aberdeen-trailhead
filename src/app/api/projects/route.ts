import { NextResponse } from "next/server";
import { getSessionUser } from "@/auth";
import { hasSupabase, sbRpc, sbSelect } from "@/lib/supabase";
import { invalidateRegistry } from "@/lib/registry";
import { checkProject, type ProjectInput } from "@/lib/project-fields";

export const dynamic = "force-dynamic";

// Create a project in HorizonView ("+ New project"). Requires sign-in. The
// project, its workstreams, milestones and starter tasks are created in one
// database transaction from the chosen template, dated from the start date.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "The project database is not configured for this site." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as ProjectInput;
  const checked = checkProject(body);
  if ("error" in checked) return NextResponse.json({ error: checked.error }, { status: 400 });

  let templateId: string | null = null;
  if (body.template_id) {
    const [tpl] = await sbSelect("project_templates", `id=eq.${encodeURIComponent(body.template_id)}&select=id`);
    if (!tpl) return NextResponse.json({ error: "That template no longer exists." }, { status: 400 });
    templateId = String(tpl.id);
  }

  try {
    const id = await sbRpc<string>("hv_create_project", {
      p: { ...checked.value, phase: checked.value.phase ?? "Initiation", template_id: templateId, created_by: user.email || user.name },
    });
    invalidateRegistry();
    return NextResponse.json({ id });
  } catch (e) {
    console.error("[projects] create failed", e);
    return NextResponse.json({ error: "Could not create the project. Please try again." }, { status: 502 });
  }
}
