import { getProjects } from "@/lib/data/provider";
import { Panel } from "@/components/ui";
import { GenerateDeckButton } from "@/components/generate-deck-button";
import { PodcastPanel } from "@/components/podcast-panel";
import { tierHasPodcasts } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const projects = await getProjects();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Automated Reporting</h1>
        <p className="mt-1 text-sm text-hv-muted">
          Executive-ready PowerPoint decks generated in one click from the Semantic Model and the
          latest AI insights — no Report Builder required.
        </p>
      </div>

      <Panel title="Portfolio Steering Committee Deck">
        <p className="mb-4 text-sm text-hv-muted">
          Portfolio health KPIs, AI executive summary, one slide per project (summary, risks,
          recommended actions, milestones, decisions), and a consolidated decisions table.
        </p>
        <GenerateDeckButton label="Generate Portfolio Deck" />
      </Panel>

      <Panel title="Portfolio Podcast Briefing">
        <p className="mb-4 text-sm text-hv-muted">
          A two-host audio rundown of the entire portfolio — health, standout projects, overdue
          items, and open decisions — rendered to MP3 with ElevenLabs voices.
        </p>
        <PodcastPanel enabled={tierHasPodcasts()} />
      </Panel>

      <Panel title="Single-Project Decks">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-hv-border p-3">
              <div>
                <div className="text-sm font-medium">{p.name}</div>
                <div className="text-xs text-hv-muted">{p.code}</div>
              </div>
              <GenerateDeckButton projectId={p.id} label="Generate" />
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Scheduled Reports">
        <p className="text-sm text-hv-muted">
          A Vercel Cron job hits <code className="rounded bg-hv-bg px-1.5 py-0.5 text-xs">/api/cron/weekly-insights</code>{" "}
          every Monday at 12:00 UTC. In live mode it triggers the Fabric AI insights notebook so
          fresh executive summaries, risk scores, and forecasts are ready before the week starts.
          Extend it to email decks via Microsoft Graph sendMail.
        </p>
      </Panel>
    </div>
  );
}
