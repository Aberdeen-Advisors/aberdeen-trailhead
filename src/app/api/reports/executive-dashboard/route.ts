import { NextResponse } from "next/server";
import { getSessionUser } from "@/auth";
import { getProject, getRaid, openDecisions } from "@/lib/data/provider";
import { demoDashboardDetail } from "@/lib/data/demo-data";
import { buildExecutiveDashboard } from "@/lib/pptx/executive-dashboard";
import { hasClientTemplate } from "@/lib/stacks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MONTHS = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];
const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const d = (iso: string) => new Date(iso + "T00:00:00Z");

// Executive Dashboard built from the client's own PowerPoint template, filled
// with the project's data at the moment of the click. Requires sign-in.
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projectId = new URL(req.url).searchParams.get("projectId") ?? "";
  const detail = demoDashboardDetail[projectId];
  const [project, raid] = await Promise.all([getProject(projectId), getRaid(projectId)]);
  if (!project || !detail || !hasClientTemplate(project)) {
    return NextResponse.json({ error: "No client template is set up for this project." }, { status: 404 });
  }

  const now = new Date();
  const asOf = `${LONG[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  const finish = project.forecastCompletionDate || project.endDate;
  const decision = project.decisionNeeded ?? openDecisions(raid)[0]?.title ?? null;
  try {
    const buffer = await buildExecutiveDashboard({
      projectName: project.name,
      shortName: project.name.replace(/^Project\s+/i, ""),
      portfolio: project.portfolio,
      asOf,
      pct: project.percentComplete,
      lastMonthPct: detail.lastMonthPct,
      targetPct: 100,
      targetLabel: finish ? `${MONTHS[d(finish).getUTCMonth()]} ${d(finish).getUTCDate()}` : "plan",
      summaryHeadline: detail.summaryHeadline,
      detailHeadline: detail.detailHeadline,
      detailSub: detail.detailSub,
      sinceLastReport: project.weeklyChangeSummary,
      next: detail.next,
      priorities: detail.priorities,
      next60: detail.next60,
      callout: decision ? { label: "Decision needed", text: decision } : { label: "Delivery sequence", text: detail.next },
      workstreams: detail.workstreams.map((w) => ({
        ...w,
        target: w.due ? `${SHORT[d(w.due).getUTCMonth()]} ${d(w.due).getUTCDate()}` : undefined,
      })),
    });
    const stamp = now.toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${project.name.replace(/[^A-Za-z0-9]+/g, "_")}_Executive_Dashboard_${stamp}.pptx"`,
      },
    });
  } catch (err) {
    console.error("Executive dashboard error:", err);
    return NextResponse.json({ error: "Could not build the executive dashboard" }, { status: 500 });
  }
}
