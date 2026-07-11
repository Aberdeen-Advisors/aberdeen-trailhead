import { getProjects } from "@/lib/data/provider";
import { powerBiReportLinks, hasPowerBi } from "@/lib/config";
import { Panel } from "@/components/ui";
import { ProjectLogo } from "@/components/project-logo";

export const dynamic = "force-dynamic";

export default async function DashboardsPage() {
  const projects = await getProjects();
  const links = powerBiReportLinks();
  const live = hasPowerBi();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Power BI Dashboards</h1>
        <p className="mt-1 text-sm text-hv-muted">
          Interactive dashboards built on the certified HorizonView Semantic Model
        </p>
      </div>

      {!live && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
          Demo mode — links below open the live Power BI reports on the Project Elevate workspace.
          Set POWERBI_* variables and POWERBI_REPORT_LINKS to surface different workspace reports
          per environment.
        </div>
      )}

      <Panel title="Portfolio Dashboards">
        <div className="grid gap-4 md:grid-cols-2">
          {(links.length > 0
            ? links
            : [
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
              ]
          ).map((l) => (
            <a
              key={l.name}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-lg border border-hv-border p-4 transition hover:border-hv-accent/50"
            >
              <span className="text-sm font-medium">{l.name}</span>
              <span className="text-xs text-hv-muted">Open in Power BI ↗</span>
            </a>
          ))}
        </div>
      </Panel>

      <Panel title="Project Reports">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <a
              key={p.id}
              href={p.powerBiReportUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-lg border border-hv-border p-3 text-sm transition hover:border-hv-accent/50"
            >
              <ProjectLogo projectId={p.id} name={p.name} size={32} />
              <span>
                {p.name}
                <span className="mt-0.5 block text-xs text-hv-muted">{p.code} · Project report ↗</span>
              </span>
            </a>
          ))}
        </div>
      </Panel>
    </div>
  );
}
