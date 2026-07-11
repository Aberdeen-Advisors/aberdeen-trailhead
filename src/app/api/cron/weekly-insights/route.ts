import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config";
import { runNotebook } from "@/lib/msft/fabric";

export const dynamic = "force-dynamic";

// Vercel Cron: Mondays 12:00 UTC (see vercel.json).
// Live mode: triggers the Fabric AI-insights notebook so the Intelligence
// Layer is refreshed (executive summaries, risk scores, forecasts).

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isDemoMode()) {
    return NextResponse.json({ status: "demo", message: "Demo mode — no notebook triggered. In live mode this refreshes the Fabric Intelligence Layer." });
  }

  const notebookId = process.env.FABRIC_INSIGHTS_NOTEBOOK_ID;
  if (!notebookId) {
    return NextResponse.json({ error: "FABRIC_INSIGHTS_NOTEBOOK_ID not configured" }, { status: 500 });
  }
  try {
    const result = await runNotebook(notebookId);
    return NextResponse.json({ ...result, status: "triggered" });
  } catch (err) {
    console.error("Cron error:", err);
    return NextResponse.json({ error: "Notebook trigger failed" }, { status: 500 });
  }
}
