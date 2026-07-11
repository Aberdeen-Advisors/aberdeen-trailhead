import { NextResponse } from "next/server";
import { getSessionUser } from "@/auth";
import { isDemoMode, tierHasPodcasts, hasAi } from "@/lib/config";
import { runNotebook } from "@/lib/msft/fabric";
import { chatCompletion } from "@/lib/ai/openai";
import { hasElevenLabs, renderPodcast } from "@/lib/ai/elevenlabs";
import { getProject, getRaid, getMilestones } from "@/lib/data/provider";

export const dynamic = "force-dynamic";

// "Build a Podcast Update" — executive tier.
// Live mode: triggers the Fabric Podcastfy notebook, which renders a two-host
// MP3 + transcript, publishes to SharePoint, and writes PodcastURL back to the
// Intelligence Layer (the project page audio player picks it up).
// Demo mode: generates the podcast script here so the workflow is visible
// end-to-end without TTS costs.

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!tierHasPodcasts()) {
    return NextResponse.json(
      { error: "Podcast updates are an Executive-tier feature." },
      { status: 403 }
    );
  }

  const { projectId } = (await req.json()) as { projectId?: string };
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const [project, raid, milestones] = await Promise.all([
    getProject(projectId),
    getRaid(projectId),
    getMilestones(projectId),
  ]);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Live mode with a configured notebook: hand off to Fabric/Podcastfy.
  // (Skipped when ElevenLabs is configured — we render the MP3 right here.)
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

  // Demo (or no notebook configured): generate the script.
  const grounding = `PROJECT: ${project.name} (${project.status}, health ${project.healthScore}/100, ${project.percentComplete}% complete, forecast finish ${project.forecastCompletionDate} vs baseline ${project.endDate}).
EXECUTIVE SUMMARY: ${project.executiveSummary}
RISK NARRATIVE: ${project.riskNarrative}
RECOMMENDED ACTIONS: ${project.recommendedActions.join("; ")}
WEEKLY CHANGES: ${project.weeklyChangeSummary}
${project.decisionNeeded ? `DECISION NEEDED: ${project.decisionNeeded}` : ""}
TOP RAID: ${raid.filter((r) => r.status !== "Closed").slice(0, 4).map((r) => `[${r.type}] ${r.title}`).join("; ")}
MILESTONES: ${milestones.map((m) => `${m.name} — ${m.forecastDate} (${m.status})`).join("; ")}`;

  let script: string;
  if (hasAi()) {
    script = await chatCompletion([
      {
        role: "system",
        content:
          "Write a two-host executive podcast script (hosts: Jordan and Casey), ~5 minutes, covering the project's health, changes, risks, and decisions. Grounded strictly in the provided data. Format each line as 'HOST: line'. Warm, sharp, executive tone.",
      },
      { role: "user", content: grounding },
    ]);
  } else {
    script = demoScript(project.name, grounding);
  }

  // With an ElevenLabs key: render the script to a real two-voice MP3.
  if (hasElevenLabs()) {
    try {
      const audio = await renderPodcast(script);
      const date = new Date().toISOString().slice(0, 10);
      return new NextResponse(new Uint8Array(audio), {
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Disposition": `attachment; filename="HorizonView_${projectId}_podcast_${date}.mp3"`,
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
    message:
      "Script generated. Add an ELEVENLABS_API_KEY to render it as a downloadable two-voice MP3.",
    script,
  });
}

function demoScript(name: string, grounding: string): string {
  const summary = grounding.match(/EXECUTIVE SUMMARY: (.*)/)?.[1] ?? "";
  const risks = grounding.match(/RISK NARRATIVE: (.*)/)?.[1] ?? "";
  const actions = grounding.match(/RECOMMENDED ACTIONS: (.*)/)?.[1] ?? "";
  const decision = grounding.match(/DECISION NEEDED: (.*)/)?.[1];
  return [
    `JORDAN: Welcome to your HorizonView executive briefing. I'm Jordan, joined by Casey, and today we're covering ${name}.`,
    `CASEY: Let's get right to it. ${summary}`,
    `JORDAN: That's the headline. What's driving the risk picture?`,
    `CASEY: ${risks}`,
    `JORDAN: So what does the program team recommend?`,
    `CASEY: Three things stand out: ${actions}.`,
    ...(decision
      ? [
          `JORDAN: And there's a decision on the table for leadership.`,
          `CASEY: Right — ${decision} That one shouldn't wait past this week.`,
        ]
      : []),
    `JORDAN: That's your update on ${name}. All figures come from the HorizonView Intelligence Layer in Microsoft Fabric — links to the full dashboard and RAID log are in the show notes.`,
    `CASEY: See you next week.`,
  ].join("\n\n");
}
