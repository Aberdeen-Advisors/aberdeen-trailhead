import { getProjects } from "@/lib/data/provider";
import { powerBiReportLinks, hasPowerBi, tierHasPodcasts } from "@/lib/config";
import { Notice, PageHeader, Panel } from "@/components/ui";
import { GenerateDeckButton } from "@/components/generate-deck-button";
import { PodcastPanel } from "@/components/podcast-panel";
import { ProjectLogo } from "@/components/project-logo";

export const dynamic = "force-dynamic";

// Dashboards and generated reports on one page: both answer "where do I see
// this?", and splitting them meant a reader had to guess whether a "report" was
// an interactive Power BI dashboard or a PowerPoint. /portal/dashboards
// redirects here.

const defaultLinks = [
  {
    name: "Overall Phase Monitor",
    url: "https://app.powerbi.com/groups/52cb886e-c058-4b2a-b4f0-078e32ed6985/reports/0a265639-75b5-43c4-b28e-02be285e0485/8057ef7abd317a2be3dc?experience=power-bi",
  },
  {
    name: "Fit Gap",
    url: "https://app.powerbi.com/groups/52cb886e-c058-4b2a-b4f0-078e32ed6985/reports/0a265639-75b5-43c4-b28e-02be285e0485/f17a90b2c3d4e5f60002?experience=power-bi",
  },
  {
    name: "Config & Build",
    url: "https://app.powerbi.com/groups/52cb886e-c058-4b2a-b4f0-078e32ed6985/reports/0a265639-75b5-43c4-b28e-02be285e0485/f17a90b2c3d4e5f60007?experience=power-bi",
  },
  {
    name: "Testing",
    url: "https://app.powerbi.com/groups/52cb886e-c058-4b2a-b4f0-078e32ed6985/reports/0a265639-75b5-43c4-b28e-02be285e0485/f17a90b2c3d4e5f60003?experience=power-bi",
  },
  {
    name: "Cutover",
    url: "https://app.powerbi.com/groups/52cb886e-c058-4b2a-b4f0-078e32ed6985/reports/0a265639-75b5-43c4-b28e-02be285e0485/f17a90b2c3d4e5f60006?experience=power-bi",
  },
  {
    name: "Hypercare",
    url: "https://app.powerbi.com/groups/52cb886e-c058-4b2a-b4f0-078e32ed6985/reports/0a265639-75b5-43c4-b28e-02be285e0485/f17a90b2c3d4e5f60008?experience=power-bi",
  },
  {
    name: "Licensing & Onboarding",
    url: "https://app.powerbi.com/groups/6305583c-9f2c-4a40-a962-78952eaeee9a/reports/5d722bb0-a74d-4fe2-987b-e9077edd789b/49e4c6f63c7438c08aa1?experience=power-bi",
  },
];

function ReportIcon() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-tint">
      <svg viewBox="0 0 24 24" fill="#09375F" aria-hidden="true" width="18" height="18">
        <path d="M4 20V10h3v10H4Zm6.5 0V4h3v16h-3ZM17 20v-7h3v7h-3Z" />
      </svg>
    </span>
  );
}

/** Section divider, matching the Transformation Program page. */
function SectionBreak({ kicker, title, sub }: { kicker: string; title: string; sub: string }) {
  return (
    <div className="border-t border-hv-border pt-8">
      <div className="hv-kicker mb-2">{kicker}</div>
      <h2 className="text-xl font-bold tracking-tight text-navy">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm font-light leading-relaxed text-hv-muted">{sub}</p>
    </div>
  );
}

export default async function ReportsPage() {
  const projects = await getProjects();
  const links = powerBiReportLinks();
  const live = hasPowerBi();
  const portfolioLinks = links.length > 0 ? links : defaultLinks;

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Dashboards & Reports"
        title="Dashboards & Reports"
        sub="Interactive Power BI dashboards for exploring the portfolio, and one-click executive reports generated from the same certified data."
      />

      {!live && (
        <Notice>
          Demo mode — the dashboard links below open the live Power BI reports on the Project Elevate
          workspace. Set the <code className="font-semibold">POWERBI_*</code> variables and{" "}
          <code className="font-semibold">POWERBI_REPORT_LINKS</code> to surface different workspace reports
          per environment.
        </Notice>
      )}

      {/* ── Live dashboards ─────────────────────────────────────────────────*/}
      <Panel
        title="Portfolio Dashboards"
        action={<span className="hv-num text-[0.72rem] text-hv-muted">{portfolioLinks.length} reports</span>}
      >
        <div className="grid gap-3 md:grid-cols-2">
          {portfolioLinks.map((l) => (
            <a
              key={l.name}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 rounded-hv border border-hv-border p-4 transition duration-200 hover:-translate-y-0.5 hover:border-teal hover:shadow-hv"
            >
              <ReportIcon />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-navy">{l.name}</span>
                <span className="hv-num mt-0.5 block text-[0.72rem] text-hv-muted">
                  Certified semantic model
                </span>
              </span>
              <span className="shrink-0 text-[0.72rem] font-semibold text-hv-subtle transition group-hover:text-teal-ink">
                Open ↗
              </span>
            </a>
          ))}
        </div>
      </Panel>

      <Panel
        title="Project Dashboards"
        action={<span className="hv-num text-[0.72rem] text-hv-muted">{projects.length} projects</span>}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <a
              key={p.id}
              href={p.powerBiReportUrl}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 rounded-hv border border-hv-border p-3.5 transition duration-200 hover:-translate-y-0.5 hover:border-teal hover:shadow-hv"
            >
              <ProjectLogo projectId={p.id} name={p.name} size={34} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-navy">{p.name}</span>
                <span className="hv-num mt-0.5 block text-[0.72rem] text-hv-muted">
                  {p.code} · Power BI report
                </span>
              </span>
              <span className="shrink-0 text-[0.72rem] font-semibold text-hv-subtle transition group-hover:text-teal-ink">
                ↗
              </span>
            </a>
          ))}
        </div>
      </Panel>

      {/* ── Generated reports ───────────────────────────────────────────────*/}
      <SectionBreak
        kicker="Automated Reporting"
        title="Generated Reports"
        sub="Executive-ready decks and audio briefings built in one click from the Semantic Model and the latest AI insights — no Report Builder required."
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
