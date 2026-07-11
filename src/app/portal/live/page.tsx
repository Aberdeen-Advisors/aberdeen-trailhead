import { Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

const ELEVATE_URL = "https://aberdeenadv.sharepoint.com/sites/elevate";

const reports = [
  {
    name: "Overall Phase Monitor",
    sub: "Portfolio phase view · Refreshed 2h ago",
    href: "https://app.powerbi.com/groups/52cb886e-c058-4b2a-b4f0-078e32ed6985/reports/0a265639-75b5-43c4-b28e-02be285e0485/8057ef7abd317a2be3dc?experience=power-bi",
  },
  {
    name: "Fit Gap",
    sub: "Gap analysis dashboard · Refreshed 4h ago",
    href: "https://app.powerbi.com/groups/52cb886e-c058-4b2a-b4f0-078e32ed6985/reports/0a265639-75b5-43c4-b28e-02be285e0485/f17a90b2c3d4e5f60002?experience=power-bi",
  },
  {
    name: "Config & Build",
    sub: "Build progress dashboard · Refreshed 6h ago",
    href: "https://app.powerbi.com/groups/52cb886e-c058-4b2a-b4f0-078e32ed6985/reports/0a265639-75b5-43c4-b28e-02be285e0485/f17a90b2c3d4e5f60007?experience=power-bi",
  },
  {
    name: "Testing",
    sub: "SIT / UAT execution · Refreshed 8h ago",
    href: "https://app.powerbi.com/groups/52cb886e-c058-4b2a-b4f0-078e32ed6985/reports/0a265639-75b5-43c4-b28e-02be285e0485/f17a90b2c3d4e5f60003?experience=power-bi",
  },
  {
    name: "Cutover",
    sub: "Cutover readiness · Refreshed 12h ago",
    href: "https://app.powerbi.com/groups/52cb886e-c058-4b2a-b4f0-078e32ed6985/reports/0a265639-75b5-43c4-b28e-02be285e0485/f17a90b2c3d4e5f60006?experience=power-bi",
  },
  {
    name: "Hypercare",
    sub: "Post go-live stabilization · Refreshed 1d ago",
    href: "https://app.powerbi.com/groups/52cb886e-c058-4b2a-b4f0-078e32ed6985/reports/0a265639-75b5-43c4-b28e-02be285e0485/f17a90b2c3d4e5f60008?experience=power-bi",
  },
  {
    name: "Licensing & Onboarding",
    sub: "Contractor onboarding & license compliance · Refreshed 1d ago",
    href: "https://app.powerbi.com/groups/6305583c-9f2c-4a40-a962-78952eaeee9a/reports/5d722bb0-a74d-4fe2-987b-e9077edd789b/49e4c6f63c7438c08aa1?experience=power-bi",
  },
];

const quickLinks = [
  { label: "RACI", ic: "📄" },
  { label: "Risks / Actions / Issues / Decisions (RAID)", ic: "⚡" },
  { label: "Deliverables Log", ic: "🚚" },
  { label: "L1 and L3 Timelines", ic: "📅" },
  { label: "Final Cutover Dashboard", ic: "✂️" },
  { label: "Core Data Validation Documents", ic: "🗂" },
  { label: "Testing Defect Management", ic: "💡" },
];

const libraries = ["Data", "Security", "Cutover", "Testing", "PMO", "Technical", "Functional"];

const updates = [
  {
    title: "Data Migration Mock Run #2 Hits Reconciliation Targets",
    body: "The second data migration mock run finished…",
    author: "Sergii Vorobiov",
    date: "June 18",
  },
  {
    title: "Security Roles & Authorizations Build Complete",
    body: "The HXM and Security teams have completed th…",
    author: "Sergii Vorobiov",
    date: "June 18",
  },
  {
    title: "SIT Cycle 2 Wraps Up with 94% Pass Rate",
    body: "System Integration Testing Cycle 2 has conclude…",
    author: "Sergii Vorobiov",
    date: "June 18",
  },
];

const phaseTiles = [
  { label: "All Phases", href: reports[0].href },
  { label: "Fit Gap", href: reports[1].href },
  { label: "Config & Build", href: reports[2].href },
  { label: "Testing", href: reports[3].href },
  { label: "Cutover", href: reports[4].href },
  { label: "Hypercare", href: reports[5].href },
];

const bullets = [
  {
    b: "Governed permissions",
    t: "inherited from Microsoft 365 & Entra ID — no parallel access model.",
  },
  {
    b: "Downstream Power BI dashboards",
    t: "linked and permissioned from the hub, one per delivery phase, all backed by the certified semantic model.",
  },
  {
    b: "Templated project sites",
    t: "for kickoff, weekly RAG, RAID, status, and decision docs — reusable across engagements.",
  },
  {
    b: "Enterprise-grade delivery",
    t: "ready to hand off to your PMO on day one, not a proof-of-concept.",
  },
];

export default function LivePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Solution in Action</h1>
        <p className="mt-1 text-sm text-hv-muted">
          A live, production-grade collaboration hub Aberdeen delivered on Microsoft 365 for an ERP
          upgrade program — governed permissions, templated project sites, and a phase-driven
          Reports Library of downstream Power BI dashboards wired to the same certified data model
          powering this portal.
        </p>
      </div>

      {/* Project Elevate style mock */}
      <div className="overflow-hidden rounded-xl border border-hv-border shadow-lg">
        {/* SharePoint chrome bar */}
        <div className="flex items-center gap-2 border-b border-neutral-200 bg-white px-3 py-1.5 text-[11px] text-neutral-500">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400"></span>
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400"></span>
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
          <span className="ml-2 truncate">aberdeenadv.sharepoint.com · /sites/elevate</span>
        </div>

        {/* Top nav */}
        <div className="flex items-center gap-4 border-b border-white/10 bg-[#0A2540] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#F26722] text-xs font-bold text-white">
              PE
            </div>
            <span className="text-base font-semibold text-white">Project Elevate</span>
          </div>
          <nav className="ml-4 hidden flex-wrap items-center gap-4 text-[13px] text-white/85 md:flex">
            <span>Weekly Status</span>
            <span>Defects</span>
            <span>Cutover</span>
            <span>Burndown</span>
            <span>Fit Gap</span>
            <span>Test Execution</span>
            <span>RAID Log</span>
            <span>Key Milestones</span>
            <span>Change Control</span>
            <span className="opacity-70">···</span>
          </nav>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-4 border-b border-neutral-200 bg-white px-4 py-2 text-[11px] text-neutral-600">
          <span>+ New</span>
          <span>⚙︎ Page details</span>
          <span>◱ Preview</span>
          <span>📊 Analytics</span>
          <span className="ml-auto rounded bg-neutral-100 px-2 py-0.5">Published on 6/22/2026</span>
          <span>Share ▾</span>
          <span>⤢</span>
          <span>✎ Edit</span>
        </div>

        {/* Body */}
        <div className="grid gap-6 bg-[#0A2540] p-6 text-white lg:grid-cols-[1.15fr_1.4fr_1fr]">
          {/* LEFT: Documentation + Libraries */}
          <div className="space-y-6">
            <section>
              <h3 className="mb-2 text-lg font-bold text-[#F26722]">Documentation</h3>
              <p className="text-[13px] leading-relaxed text-white/85">
                All documentation (working, under review, or final) should be stored on the ERP
                Upgrade – Internal SharePoint site.
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-white/85">
                Please read and follow the{" "}
                <span className="text-[#6ec1ff] underline">documentation standards</span> before
                adding documents to the site.
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-white/85">
                Refer to the <span className="text-[#6ec1ff] underline">training materials</span>{" "}
                for proper documentation storage, best practices, and tips for using the SharePoint
                libraries.
              </p>
            </section>

            <section>
              <h3 className="mb-2 text-lg font-bold text-[#F26722]">Libraries</h3>
              <div className="grid grid-cols-2 gap-2">
                {libraries.map((l) => (
                  <div
                    key={l}
                    className="flex items-center gap-2 rounded bg-[#3F98D6] px-3 py-2.5 text-[13px] font-medium text-white shadow-sm"
                  >
                    <span>📁</span>
                    {l}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* CENTER: Upgrade Updates + Phases */}
          <div className="space-y-6">
            <section>
              <h3 className="mb-2 text-lg font-bold text-[#F26722]">Upgrade Updates</h3>
              <div className="mb-3 text-[13px] text-white/60">+ Add ▾</div>
              <div className="space-y-4">
                {updates.map((u) => (
                  <div key={u.title} className="flex gap-3 border-b border-white/10 pb-4 last:border-0">
                    <div className="h-16 w-24 shrink-0 rounded bg-gradient-to-br from-[#0F4B7A] via-[#37718F] to-[#44B0B1]"></div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold leading-tight text-white">{u.title}</div>
                      <div className="mt-0.5 truncate text-[11px] text-white/70">{u.body}</div>
                      <div className="mt-1 text-[10px] text-white/60">
                        <span className="font-semibold text-white/80">{u.author}</span> {u.date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-lg font-bold text-[#F26722]">Phases</h3>
              <div className="grid grid-cols-3 gap-2">
                {phaseTiles.map((p) => (
                  <a
                    key={p.label}
                    href={p.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex aspect-[4/3] flex-col items-center justify-center rounded bg-[#3F98D6] p-2 text-center text-[12px] font-semibold text-white transition hover:bg-[#5FAFE4]"
                  >
                    <span className="mb-1 text-lg">📊</span>
                    {p.label}
                  </a>
                ))}
              </div>
            </section>
          </div>

          {/* RIGHT: Quick Links */}
          <div>
            <h3 className="mb-2 text-lg font-bold text-[#F26722]">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((q) => (
                <li
                  key={q.label}
                  className="flex items-start gap-3 rounded bg-white/[0.03] px-3 py-2.5 text-[13px] text-white/90 hover:bg-white/[0.06]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-white/10 text-sm">
                    {q.ic}
                  </div>
                  <span className="leading-tight">{q.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Value bullets + CTA */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Panel title="What makes it enterprise-grade">
          <ul className="space-y-3">
            {bullets.map((b) => (
              <li
                key={b.b}
                className="flex gap-3 border-b border-hv-border/60 pb-3 last:border-0 last:pb-0"
              >
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm bg-hv-accent"></span>
                <p className="text-sm leading-relaxed text-hv-text">
                  <span className="font-semibold text-hv-text">{b.b}</span>{" "}
                  <span className="text-hv-muted">{b.t}</span>
                </p>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <div className="flex h-full flex-col justify-center">
            <p className="mb-4 text-sm text-hv-muted">
              Tour the live SharePoint hub — Aberdeen tenant sign-in required.
            </p>
            <a
              href={ELEVATE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-hv-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-hv-accent/90"
            >
              Open Project Elevate ↗
            </a>
          </div>
        </Panel>
      </div>

      <Panel title="Downstream Power BI Dashboards">
        <p className="mb-4 text-sm text-hv-muted">
          Certified Power BI dashboards linked from the Elevate hub, one per delivery phase — click
          to open the report (sign-in required for non-tenant users).
        </p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((r) => (
            <a
              key={r.name}
              href={r.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-lg border border-hv-border p-3 text-sm transition hover:border-hv-accent/50"
            >
              <span>
                {r.name}
                <span className="mt-0.5 block text-xs text-hv-muted">{r.sub} ↗</span>
              </span>
              <span className="text-xs text-hv-muted">📊</span>
            </a>
          ))}
        </div>
      </Panel>
    </div>
  );
}
