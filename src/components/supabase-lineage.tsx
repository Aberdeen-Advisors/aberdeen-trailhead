"use client";

import { useEffect, useState } from "react";

// "How this page works" for projects whose data lives in HorizonView's own
// database (Supabase / Postgres) rather than the client's Microsoft 365 stack.
// Written for the client team reading the page.

const STEPS = [
  { title: "Your team edits here", body: "Plan, milestones, RAID and weekly status in the tables on this page", tag: "No Planner or Project" },
  { title: "Checked and saved", body: "HorizonView confirms you are signed in, checks the values, then saves", tag: "Microsoft 365 sign-in" },
  { title: "Your project database", body: "One secure database holds every table, with a full change history", tag: "Supabase · Postgres" },
  { title: "This page updates", body: "The plan, KPIs and status on this page redraw as soon as you save", tag: "Instant" },
  { title: "Dashboard, deck, podcast", body: "Live dashboard checks every 60 seconds; deck and podcast read at the click", tag: "Same numbers everywhere" },
];

const FEEDS: { table: string; feeds: string }[] = [
  { table: "Tasks & Activities", feeds: "The bars on the Project Plan and the printable plan, plus your accomplishments and next steps" },
  { table: "Milestones", feeds: "The diamonds on the Project Plan, the AI Forecast Finish (from Go-Live), the dashboard milestone view, the milestone slide in your SteerCo deck and the podcast" },
  { table: "RAID Log", feeds: "The dashboard RAID view, open RAID counts across the portfolio, the RAID slide in your SteerCo deck and the podcast" },
  { table: "Weekly Status", feeds: "The Weekly Change Summary on this page (latest project-level update), your SteerCo deck and the podcast" },
  { table: "Workstreams", feeds: "Plan grouping, plus progress and health by workstream on the live dashboard" },
  { table: "Interdependencies", feeds: "Hand-offs between your workstreams, kept with the plan for your team" },
];

function ago(mins: number) {
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  return h < 48 ? `${h} hr${h === 1 ? "" : "s"} ago` : `${Math.floor(h / 24)} days ago`;
}

const TABLE_LABEL: Record<string, string> = {
  activities: "Tasks & Activities", milestones: "Milestones", raid_items: "RAID Log", status_updates: "Weekly Status",
  workstreams: "Workstreams", interdependencies: "Interdependencies", projects: "Project details",
};

export function SupabaseLineage({
  projectName,
  lastChange,
  dashboardUrl,
}: {
  projectName: string;
  lastChange: { at: string; by: string; table: string } | null;
  dashboardUrl?: string | null;
}) {
  // Times are shown in the viewer's own time zone, after hydration.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const at = lastChange ? Date.parse(lastChange.at) : NaN;
  const when = now != null && !Number.isNaN(at)
    ? new Date(at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;
  const mins = now != null && !Number.isNaN(at) ? Math.max(0, Math.round((now - at) / 60_000)) : null;
  const who = lastChange?.by && lastChange.by !== "seed" ? ` by ${lastChange.by}` : "";

  return (
    <section className="hv-card p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-hv-border pb-3">
        <h2 className="hv-kicker">How this page works</h2>
        {dashboardUrl && (
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-hv-border px-3 py-1.5 text-[0.72rem] font-semibold text-navy transition hover:border-teal hover:text-teal-ink"
          >
            Open the live dashboard ↗
          </a>
        )}
      </div>

      <p className="max-w-3xl text-sm font-light leading-relaxed text-hv-text">
        {projectName} runs entirely inside HorizonView. Your team keeps the plan, milestones, RAID log and weekly status in the
        tables on this page, and they are saved straight to your <span className="font-medium">HorizonView project database</span>.
        There is no SharePoint, Planner, Project or Power BI behind it, only your Microsoft 365 sign-in. Every view of the
        project, from this page to your SteerCo deck, reads from that one database, so nobody re-keys a status report.
      </p>

      {/* Flow */}
      <ol className="mt-6 grid gap-3 md:grid-cols-5">
        {STEPS.map((s, i) => (
          <li key={s.title} className="relative rounded-xl border border-hv-border bg-hv-bg p-4">
            <span className="hv-num text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-teal-ink">Step {i + 1}</span>
            <div className="mt-1 text-sm font-semibold text-navy">{s.title}</div>
            <p className="mt-1 text-[0.75rem] font-light leading-snug text-hv-muted">{s.body}</p>
            <span className="mt-2 inline-block rounded-full bg-white px-2 py-0.5 text-[0.66rem] text-hv-muted">{s.tag}</span>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-hv-border bg-white text-xs text-teal-ink md:flex"
              >
                →
              </span>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* What a save does */}
        <div>
          <h3 className="text-sm font-semibold text-navy">What happens when you save a change</h3>
          <ul className="mt-3 space-y-2.5 text-[0.8rem] leading-relaxed text-hv-text">
            <li className="flex gap-2.5"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
              <span><span className="font-medium">It is saved at once.</span> Leaving a cell (or pressing Enter) writes the change to your database. There is no separate publish step and no overnight refresh.</span></li>
            <li className="flex gap-2.5"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
              <span><span className="font-medium">This page catches up straight away.</span> The Project Plan redraws, and the KPIs, status and Weekly Change Summary at the top re-read the database within a second.</span></li>
            <li className="flex gap-2.5"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
              <span><span className="font-medium">The live dashboard follows within a minute.</span> It checks for new data every 60 seconds; press Refresh on the dashboard to see a change immediately.</span></li>
            <li className="flex gap-2.5"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
              <span><span className="font-medium">Your SteerCo deck and podcast use the latest data.</span> Both are built from the database at the moment you click Generate, so a deck made after a change already includes it.</span></li>
            <li className="flex gap-2.5"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
              <span><span className="font-medium">Teammates see it on their next view.</span> Anyone else with this page open sees your change when their page next loads or they make a change of their own.</span></li>
            <li className="flex gap-2.5"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
              <span><span className="font-medium">Every change is recorded.</span> The database keeps who changed what and when, including the before and after values, so nothing is lost and edits can be traced.</span></li>
          </ul>
        </div>

        {/* Where each table shows up */}
        <div>
          <h3 className="text-sm font-semibold text-navy">Where each table shows up</h3>
          <div className="mt-3 overflow-hidden rounded-lg border border-hv-border">
            <table className="w-full text-left text-[0.78rem]">
              <thead className="bg-hv-bg">
                <tr>
                  <th className="px-3 py-2 font-semibold text-navy">Table on this page</th>
                  <th className="px-3 py-2 font-semibold text-navy">Feeds</th>
                </tr>
              </thead>
              <tbody>
                {FEEDS.map((f) => (
                  <tr key={f.table} className="border-t border-hv-border align-top">
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-hv-text">{f.table}</td>
                    <td className="px-3 py-2 font-light text-hv-muted">{f.feeds}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[0.7rem] leading-relaxed text-hv-subtle">
            Budget, actuals and defect counts sit in the same database, loaded from your finance and test records. They
            drive the Budget and Forecast at Completion figures and the dashboard charts.
          </p>
        </div>
      </div>

      {/* Security + freshness */}
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-hv-border bg-hv-bg p-3 text-[0.75rem] leading-relaxed text-hv-muted">
          <span className="font-semibold text-navy">Who can see and change it: </span>
          only people who sign in with your Microsoft 365 account. Your browser never talks to the database directly; every
          read and save goes through HorizonView, which checks your sign-in and the table first.
        </div>
        <div className="rounded-lg border border-teal/40 bg-teal-tint/40 p-3 text-[0.75rem] leading-relaxed text-hv-text">
          <span className="font-semibold">Live data · no refresh schedule. </span>
          This page reads the database every time it opens.{" "}
          {lastChange ? (
            <>Last change: {TABLE_LABEL[lastChange.table] ?? lastChange.table}, {when ?? "…"}{mins != null && <> ({ago(mins)})</>}{who}.</>
          ) : (
            <span className="text-hv-subtle">The last change time is unavailable right now.</span>
          )}
        </div>
      </div>
    </section>
  );
}
