import { getProjects } from "@/lib/data/provider";
import { PageHeader, Panel } from "@/components/ui";
import { GenerateDeckButton } from "@/components/generate-deck-button";
import { PodcastPanel } from "@/components/podcast-panel";
import { tierHasPodcasts } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const projects = await getProjects();

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Reports"
        title="Automated Reporting"
        sub="Executive-ready PowerPoint decks generated in one click from the Semantic Model and the latest AI insights — no Report Builder required."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Portfolio Steering Committee Deck"
          action={<span className="hv-chip bg-navy">PPTX</span>}
        >
          <p className="mb-5 text-sm font-light leading-relaxed text-hv-muted">
            Portfolio health KPIs, AI executive summary, one slide per project (summary, risks,
            recommended actions, milestones, decisions), and a consolidated decisions table.
          </p>
          <GenerateDeckButton label="Generate Portfolio Deck" />
        </Panel>

        <Panel title="Portfolio Podcast Briefing" action={<span className="hv-chip bg-teal-bright">MP3</span>}>
          <p className="mb-5 text-sm font-light leading-relaxed text-hv-muted">
            A two-host audio rundown of the entire portfolio — health, standout projects, overdue
            items, and open decisions — rendered to MP3 with ElevenLabs voices.
          </p>
          <PodcastPanel enabled={tierHasPodcasts()} />
        </Panel>
      </div>

      <Panel
        title="Single-Project Decks"
        action={<span className="hv-num text-[0.72rem] text-hv-muted">{projects.length} projects</span>}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-hv border border-hv-border p-3.5 transition hover:border-teal"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-navy">{p.name}</div>
                <div className="hv-num mt-0.5 text-[0.72rem] text-hv-muted">{p.code}</div>
              </div>
              <GenerateDeckButton projectId={p.id} label="Generate" />
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Scheduled Reports">
        <p className="text-sm font-light leading-relaxed text-hv-muted">
          A Vercel Cron job hits{" "}
          <code className="rounded bg-navy-tint px-1.5 py-0.5 font-num text-xs font-semibold text-navy">
            /api/cron/weekly-insights
          </code>{" "}
          every Monday at 12:00 UTC. In live mode it triggers the Fabric AI insights notebook so
          fresh executive summaries, risk scores, and forecasts are ready before the week starts.
          Extend it to email decks via Microsoft Graph sendMail.
        </p>
      </Panel>
    </div>
  );
}
