import { NextResponse } from "next/server";
import { askHorizon, type ChatTurn } from "@/lib/ai/agent";
import { getSessionUser } from "@/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Ask Horizon. Accepts the conversation so far ({ messages: [{role, content}] })
// or a single { question } for older callers. Read-only; requires sign-in.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { question?: string; messages?: ChatTurn[] };
  const turns: ChatTurn[] = Array.isArray(body.messages)
    ? body.messages
        .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
        .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
        .slice(-20)
    : body.question?.trim()
      ? [{ role: "user", content: body.question.trim() }]
      : [];
  if (!turns.length || turns[turns.length - 1].role !== "user") {
    return NextResponse.json({ error: "A question is required" }, { status: 400 });
  }
  try {
    return NextResponse.json(await askHorizon(turns));
  } catch (err) {
    console.error("Ask Horizon error:", err);
    return NextResponse.json({ error: "Ask Horizon couldn't answer just now. Please try again." }, { status: 500 });
  }
}
