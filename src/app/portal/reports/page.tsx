import { getProjects } from "@/lib/data/provider";
import { powerBiReportLinks, hasPowerBi, tierHasPodcasts } from "@/lib/config";
import { Notice, PageHeader, Panel } from "@/components/ui";
import { GenerateDeckButton } from "@/components/generate-deck-button";
import { PodcastPanel } from "@/components/podcast-panel";
import { ProjectLogo } from "@/components/project-logo";
import { projectDashboard, hasClientTemplate } from "@/lib/stacks";
import { styleFor } from "@/components/showcase-dashboards";

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
        sub="Interactive dashboards for exploring the portfolio and each project, and one-click executive reports generated from the same data."
      />

      {!live && (
        <Notice>
          Demo mode — the portfolio dashboards open the live Power BI reports on the Project Elevate
          workspace. Project dashboards open where each project lives: Power BI for Elevate, the live HTML
          dashboard for projects kept in HorizonView, and a built-in HorizonView dashboard (each in a different
          style) for the sample projects. Set the <code className="font-semibold">POWERBI_*</code> variables and{" "}
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
          {projects.map((p) => {
            const dash = projectDashboard(p);
            const sub = dash.kind === "internal" ? `${dash.label} · ${styleFor(p.id).name} style` : dash.label;
            const badge = { powerbi: ["Power BI", "bg-[#F2C811]/20 text-[#7A5F00]"], html: ["HTML", "bg-teal-tint text-teal-ink"], internal: ["HorizonView", "bg-navy/10 text-navy"] }[dash.kind];
            return (
            <a
              key={p.id}
              href={dash.href}
              {...(dash.kind === "internal" ? {} : { target: "_blank", rel: "noreferrer" })}
              className="group flex items-center gap-3 rounded-hv border border-hv-border p-3.5 transition duration-200 hover:-translate-y-0.5 hover:border-teal hover:shadow-hv"
            >
              <ProjectLogo projectId={p.id} name={p.name} size={34} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-navy">{p.name}</span>
                <span className="hv-num mt-0.5 block truncate text-[0.72rem] text-hv-muted">
                  {p.code} · {sub}
                </span>
              </span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.62rem] font-semibold ${badge[1]}`}>{badge[0]}</span>
              <span className="shrink-0 text-[0.72rem] font-semibold text-hv-subtle transition group-hover:text-teal-ink">
                {dash.kind === "internal" ? "→" : "↗"}
              </span>
            </a>
            );
          })}
        </div>
      </Panel>

      {/* ── Generated reports ───────────────────────────────────────────────*/}
      <SectionBreak
        kicker="Automated Reporting"
        title="Generated Reports"
        sub="Executive-ready decks and audio briefings built in one click from each project's live data and AI summaries — no Report Builder required."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Portfolio Steering Committee Deck"
          action={<span className="hv-chip bg-navy">PPTX</span>}
        >
          <p className="mb-5 text-sm font-light leading-relaxed text-hv-muted">
            <span className="font-semibold text-navy">Built to your company template.</span> Sums up the whole
            portfolio: health KPIs and an AI executive summary, one slide per project (summary, risks,
            recommended actions, milestones, decisions), and a consolidated decisions table. We customize the
            deck to your own PowerPoint template, so it arrives in your brand, layout and fonts, ready to present.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <GenerateDeckButton label="Generate Portfolio Deck" />
            <GenerateDeckButton endpoint="/api/reports/guest-deck" label="Guest Demo Deck" variant="secondary" />
          </div>
          <p className="mt-3 text-[0.72rem] font-light leading-relaxed text-hv-subtle">
            Guest Demo Deck: the same portfolio built into a guest client&apos;s template (PKFOD executive
            dashboard), showing how any template can be filled. Cover, portfolio summary, then one dashboard
            slide per project, filled from live data.
          </p>
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
              className="flex flex-wrap items-center justify-between gap-3 rounded-hv border border-hv-border p-3.5 transition hover:border-teal"
            >
              <div className="min-w-[9rem] flex-1">
                <div className="truncate text-sm font-semibold text-navy">{p.name}</div>
                <div className="hv-num mt-0.5 text-[0.72rem] text-hv-muted">{p.code}</div>
              </div>
              {/* Same buttons, same output as the project page. */}
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                <GenerateDeckButton projectId={p.id} label="SteerCo Deck" />
                {hasClientTemplate(p) && (
                  <GenerateDeckButton
                    projectId={p.id}
                    endpoint="/api/reports/executive-dashboard"
                    label="Client template"
                    variant="secondary"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="Scheduled Reports & Agentic Automation"
        action={<span className="hv-chip bg-navy">Scoped at implementation</span>}
      >
        <p className="max-w-4xl text-sm font-light leading-relaxed text-hv-muted">
          Reports shouldn&apos;t wait for someone to click a button. HorizonView&apos;s data, decks and briefings can run
          on autopilot: delivered on a schedule, triggered the moment something changes, and chased until it&apos;s
          done. Aberdeen scopes the automations with you during your HorizonView implementation, then builds them on
          the platform that fits your stack.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            { name: "Power Automate", logo: "power-automate", text: "For Microsoft 365 shops: Outlook, Teams and SharePoint flows with your existing security and approvals." },
            { name: "n8n", logo: "n8n", text: "Open, self-hostable workflows that connect HorizonView to almost any system, from Jira to Slack to ServiceNow." },
            { name: "CrewAI agents", logo: "crewai", text: "Teams of AI agents that read the portfolio, reason about it, draft the follow-up and hand it to a human to approve." },
          ].map((t) => (
            <div key={t.name} className="rounded-hv border border-hv-border bg-hv-bg p-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-hv-border bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/automation-logos/${t.logo}.svg`} alt="" aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-navy">{t.name}</span>
              </div>
              <p className="mt-2 text-[0.78rem] font-light leading-relaxed text-hv-muted">{t.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {[
            {
              scope: "Transformation program",
              items: [
                "Monday 7am: the portfolio SteerCo deck and podcast land in every executive's inbox, built from Friday's data",
                "Benefits and cost tracking rolls up from every workstream into one monthly board pack, no spreadsheets",
                "An agent drafts the program status narrative; the PMO lead edits and approves it in Teams",
              ],
            },
            {
              scope: "Portfolio",
              items: [
                "A project turns Red: the sponsor gets a Teams alert with the reason and the recommended action",
                "Decisions past their due date escalate automatically, first to the owner, then to the sponsor",
                "Weekly digest of what changed across all projects: new risks, slipped milestones, closed items",
              ],
            },
            {
              scope: "Single project",
              items: [
                "Overdue task reminders to each owner, with a one-click link to update status",
                "Thursday nudge to the PM when this week's status hasn't been entered yet",
                "Milestone 5 days out and not on track: the agent drafts a recovery note and books the review",
              ],
            },
          ].map((g) => (
            <div key={g.scope} className="rounded-hv border border-hv-border p-4">
              <div className="hv-kicker mb-3">{g.scope}</div>
              <ul className="space-y-2.5">
                {g.items.map((i) => (
                  <li key={i} className="flex gap-2.5 text-[0.8rem] leading-relaxed text-hv-text">
                    <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-5 border-t border-hv-border pt-4 text-[0.75rem] font-light leading-relaxed text-hv-subtle">
          Every automation reads the same project data you see here, whatever system each project runs on, and anything
          that goes to a person can be set to require human approval first. Already running: a weekly scheduled job
          (Mondays, 12:00 UTC) that refreshes AI insights for projects on Microsoft Fabric.
        </p>
      </Panel>
    </div>
  );
}
