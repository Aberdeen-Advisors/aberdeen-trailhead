import { NextResponse } from "next/server";
import { getSessionUser } from "@/auth";
import { isRaidEditable } from "@/lib/data/provider";
import { createRaid, deleteRaid, resetRaid, updateRaid } from "@/lib/data/raid-store";

// Create / update / delete RAID items from the project page.
// Demo mode only — see isRaidEditable() and raid-store.ts.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Shared gate: signed in (demo mode returns a demo user) and editing allowed. */
async function guard(): Promise<NextResponse | null> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRaidEditable()) {
    return NextResponse.json(
      { error: "RAID is read-only in live mode; SharePoint Lists are the source of truth." },
      { status: 403 }
    );
  }
  return null;
}

async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;

  const data = await body(req);
  const projectId = typeof data.projectId === "string" ? data.projectId : "";
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

  try {
    const item = await createRaid(projectId, data);
    return NextResponse.json({ item });
  } catch (err) {
    console.error("RAID create failed:", err);
    return NextResponse.json({ error: "Could not create the item" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const denied = await guard();
  if (denied) return denied;

  const data = await body(req);
  const id = typeof data.id === "string" ? data.id : "";
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    const patch = await updateRaid(id, data);
    return NextResponse.json({ patch });
  } catch (err) {
    console.error("RAID update failed:", err);
    return NextResponse.json({ error: "Could not save the change" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const denied = await guard();
  if (denied) return denied;

  const params = new URL(req.url).searchParams;

  // ?all=1 discards every portal edit and restores the shipped demo set —
  // handy for resetting between demo runs.
  if (params.get("all") === "1") {
    await resetRaid();
    return NextResponse.json({ ok: true, reset: true });
  }

  const id = params.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    await deleteRaid(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("RAID delete failed:", err);
    return NextResponse.json({ error: "Could not delete the item" }, { status: 500 });
  }
}
