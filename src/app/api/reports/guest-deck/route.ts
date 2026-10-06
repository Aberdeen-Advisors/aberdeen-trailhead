import { NextResponse } from "next/server";
import { getSessionUser } from "@/auth";
import { buildGuestDeck } from "@/lib/pptx/guest-deck";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Guest Demo Deck: the whole portfolio in a client's own PowerPoint template
// (cover, portfolio summary, one dashboard per project). Requires sign-in.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const buffer = await buildGuestDeck();
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="Portfolio_Executive_Dashboard_Guest_${date}.pptx"`,
      },
    });
  } catch (err) {
    console.error("Guest deck error:", err);
    return NextResponse.json({ error: "Could not build the guest demo deck" }, { status: 500 });
  }
}
