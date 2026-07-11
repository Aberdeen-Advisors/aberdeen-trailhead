import { NextResponse } from "next/server";
import { askHorizon } from "@/lib/ai/agent";
import { getSessionUser } from "@/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { question } = (await req.json()) as { question?: string };
  if (!question?.trim()) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }
  try {
    const result = await askHorizon(question.trim());
    return NextResponse.json(result);
  } catch (err) {
    console.error("Ask Horizon error:", err);
    return NextResponse.json({ error: "Agent failed to answer" }, { status: 500 });
  }
}
