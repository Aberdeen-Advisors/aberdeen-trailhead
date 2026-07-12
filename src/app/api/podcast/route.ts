import { NextResponse } from "next/server";
import { getSessionUser } from "@/auth";
import { isDemoMode, tierHasPodcasts, hasAi } from "@/lib/config";
import { runNotebook } from "@/lib/msft/fabric";
import { chatCompletion } from "@/lib/ai/openai";
import { hasElevenLabs, renderPodcast } from "@/lib/ai/elevenlabs";
import { getProject, getProjects, getRaid, getMilestones, getPortfolioKpis } from "@/lib/data/provider";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // long TTS renders (Vercel caps by plan)

// "Build a Podcast Update" — executive tier.
// GPT-4o writes the two-host script (executive tone, English, grounded in the
// data), ElevenLabs renders it to MP3. Episode length auto-scales with scope:
// single project ≈ 4 min; portfolio ≈ 3 min + ~45s per project, capped at 10.

const LINES_PER_MINUTE = 6;

function episodeMinutes(projectCount: number): number {
  if (projectCount <= 1) return 4;
  return Math.min(10, Math.round(3 + projectCount * 0.75));
}

const WORDS_PER_MINUTE = 145;

function systemPrompt(minutes: number, portfolio: boolean): string {
  const words = minutes * WORDS_PER_MINUTE;
  return (
    `Write a two-host podcast script (hosts: Mark and Ellen). Hard length requirement: at least ${words} words ` +
    `(about ${minutes} minutes when spoken) — scripts shorter than this are unacceptable. Each line should be 2-4 full sentences. ` +
    "Ground it STRICTLY in the provided data. Format every line as 'MARK: ...' or 'ELLEN: ...' " +
    "with no other text, headings, or stage directions. Warm, sharp, executive tone. " +
    "Cover ONLY what leaders critically need to know: material risks, overdue items, decisions needed, and forecast changes. " +
    (portfolio
      ? "Spend the most time on Red and Amber projects and open decisions; healthy Green projects get at most one line each. "
      : "") +
    "Open with the single most important headline, close with clear next steps."
  );
}

async function portfolioGrounding(): Promise<{ grounding: string; projectCount: number }> {
  const [kpis, projects, raid] = await Promise.all([getPortfolioKpis(), getProjects(), getRaid()]);
  const decisions = raid.filter((r) => r.type === "Decision" && r.status !== "Closed");
  const overdue = raid.filter((r) => r.status === "Overdue");
  const grounding = `SCOPE: Whole portfolio briefing.
PORTFOLIO: ${kpis.totalProjects} projects — ${kpis.green} Green, ${kpis.amber} Amber, ${kpis.red} Red. Executive health ${kpis.executiveHealthScore}/100. Milestone completion ${kpis.milestoneCompletionPct.toFixed(0)}%. Open RAID items: ${kpis.openRaidCount}. Open decisions: ${kpis.openDecisions}.
PORTFOLIO SUMMARY: ${kpis.portfolioSummary}
PROJECTS:
${projects.map((p) => `- ${p.name} (${p.status}, health ${p.healthScore}, ${p.percentComplete}% complete): ${p.executiveSummary.slice(0, 220)}`).join("\n")}
OPEN DECISIONS: ${decisions.slice(0, 6).map((d) => `${d.title} (due ${d.dueDate}${d.status === "Overdue" ? ", OVERDUE" : ""})`).join("; ") || "none"}
OVERDUE ITEMS: ${overdue.slice(0, 6).map((r) => `[${r.type}] ${r.title}`).join("; ") || "none"}`;
  return { grounding, projectCount: projects.length };
}

async function projectGrounding(projectId: string): Promise<string | null> {
  const [project, raid, milestones] = await Promise.all([
    getProject(projectId),
    getRaid(projectId),
    getMilestones(projectId),
  ]);
  if (!project) return null;
  return `SCOPE: Single project briefing.
PROJECT: ${project.name} (${project.status}, health ${project.healthScore}/100, ${project.percentComplete}% complete, forecast finish ${project.forecastCompletionDate} vs baseline ${project.endDate}).
EXECUTIVE SUMMARY: ${project.executiveSummary}
RISK NARRATIVE: ${project.riskNarrative}
RECOMMENDED ACTIONS: ${project.recommendedActions.join("; ")}
WEEKLY CHANGES: ${project.weeklyChangeSummary}
${project.decisionNeeded ? `DECISION NEEDED: ${project.decisionNeeded}` : ""}
TOP RAID: ${raid.filter((r) => r.status !== "Closed").slice(0, 4).map((r) => `[${r.type}] ${r.title}`).join("; ")}
MILESTONES: ${milestones.slice(0, 15).map((m) => `${m.name} — ${m.forecastDate} (${m.status})`).join("; ")}`;
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!tierHasPodcasts()) {
    return NextResponse.json(
      { error: "Podcast updates are an Executive-tier feature." },
      { status: 403 }
    );
  }

  const { projectId } = (await req.json().catch(() => ({}))) as { projectId?: string };

  // Live mode with a configured notebook and no in-app TTS: hand off to Fabric.
  if (!isDemoMode() && process.env.FABRIC_PODCAST_NOTEBOOK_ID && !hasElevenLabs()) {
    try {
      const result = await runNotebook(process.env.FABRIC_PODCAST_NOTEBOOK_ID);
      return NextResponse.json({
        mode: "fabric",
        message:
          "Podcast notebook triggered in Microsoft Fabric. The MP3 and transcript will publish to SharePoint and appear here when the Intelligence Layer refreshes.",
        job: result,
      });
    } catch (err) {
      console.error("Podcast notebook error:", err);
      return NextResponse.json({ error: "Failed to trigger podcast notebook" }, { status: 500 });
    }
  }

  let grounding: string | null;
  let minutes: number;
  if (projectId) {
    grounding = await projectGrounding(projectId);
    minutes = episodeMinutes(1);
  } else {
    const p = await portfolioGrounding();
    grounding = p.grounding;
    minutes = episodeMinutes(p.projectCount);
  }
  if (!grounding) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  let script: string;
  if (hasAi()) {
    const sys = systemPrompt(minutes, !projectId);
    script = await chatCompletion(
      [
        { role: "system", content: sys },
        { role: "user", content: grounding },
      ],
      { temperature: 0.3 }
    );
    // Models routinely undershoot spoken-length targets; expand once if short.
    const target = minutes * WORDS_PER_MINUTE;
    const words = script.split(/\s+/).length;
    if (words < target * 0.75) {
      script = await chatCompletion(
        [
          { role: "system", content: sys },
          { role: "user", content: grounding },
          { role: "assistant", content: script },
          {
            role: "user",
            content: `That script is only ${words} words — the requirement is at least ${target}. Rewrite it at full length: go deeper on the at-risk projects, overdue items, and decisions (still strictly grounded in the data), keep the same MARK:/ELLEN: format, and return the complete expanded script.`,
          },
        ],
        { temperature: 0.3 }
      );
    }
  } else {
    script = `MARK: Welcome to your HorizonView executive briefing.\n\nELLEN: ${grounding.split("\n")[1] ?? ""}\n\nMARK: Configure an AI key for the full script experience.`;
  }

  if (hasElevenLabs()) {
    try {
      const audio = await renderPodcast(script, minutes * LINES_PER_MINUTE + 6);
      const date = new Date().toISOString().slice(0, 10);
      const scope = projectId ?? "portfolio";
      return new NextResponse(new Uint8Array(audio), {
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Disposition": `attachment; filename="HorizonView_${scope}_podcast_${date}.mp3"`,
          "X-Podcast-Mode": "elevenlabs",
        },
      });
    } catch (err) {
      console.error("Podcast TTS error:", err);
      return NextResponse.json(
        { error: "Audio rendering failed — check the ElevenLabs key and quota. Script was generated successfully.", script },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({
    mode: "script",
    message: "Script generated. Add an ELEVENLABS_API_KEY to render it as a downloadable two-voice MP3.",
    script,
  });
}
