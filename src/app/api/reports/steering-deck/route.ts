import { NextResponse } from "next/server";
import { buildSteeringDeck } from "@/lib/pptx/steering-deck";
import { getSessionUser } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = new URL(req.url).searchParams.get("projectId") ?? undefined;
  try {
    const buffer = await buildSteeringDeck(projectId);
    const date = new Date().toISOString().slice(0, 10);
    const name = projectId ? `HorizonView_${projectId}_SteerCo_${date}.pptx` : `HorizonView_Portfolio_SteerCo_${date}.pptx`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${name}"`,
      },
    });
  } catch (err) {
    console.error("Deck generation error:", err);
    return NextResponse.json({ error: "Deck generation failed" }, { status: 500 });
  }
}
