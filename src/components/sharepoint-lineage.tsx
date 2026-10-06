"use client";

import { useEffect, useState } from "react";

// "Where this data comes from" for projects run on the client's Microsoft 365
// stack: a lineage strip (SharePoint → Lists → Fabric → semantic model →
// HorizonView) and example SharePoint lists, styled like the real thing.
// The rows are illustrative; the live lists sit on the project's SharePoint site.

type Cell = string | { pill: string } | { person: string };
type ListDef = {
  id: string;
  title: string;
  modelTable?: string; // semantic-model table the portal reads, if any
  powers: string;
  columns: string[];
  rows: Cell[][];
};

// SharePoint-style choice colours (soft fills, dark text).
const PILL: Record<string, [string, string]> = {
  "On Track": ["#DFF6DD", "#0B6A0B"],
  Complete: ["#DFF6DD", "#0B6A0B"],
  Completed: ["#DFF6DD", "#0B6A0B"],
  Closed: ["#E1E1E1", "#3B3A39"],
  "At Risk": ["#FFF4CE", "#795600"],
  "In Progress": ["#DEECF9", "#0F548C"],
  "Off Track": ["#FDE7E9", "#A4262C"],
  Late: ["#FDE7E9", "#A4262C"],
  Blocked: ["#FDE7E9", "#A4262C"],
  Open: ["#DEECF9", "#0F548C"],
  "Not Started": ["#F3F2F1", "#605E5C"],
  Critical: ["#FDE7E9", "#A4262C"],
  High: ["#FED9CC", "#8E3B12"],
  Medium: ["#FFF4CE", "#795600"],
  Low: ["#F3F2F1", "#605E5C"],
  Risk: ["#F4E5F8", "#6B2C83"],
  Issue: ["#FDE7E9", "#A4262C"],
  Action: ["#DEECF9", "#0F548C"],
  Decision: ["#E1F3F3", "#0E6A6B"],
  Accomplishment: ["#DFF6DD", "#0B6A0B"],
  "Next Step": ["#DEECF9", "#0F548C"],
  Yes: ["#F3F2F1", "#605E5C"],
  No: ["#F3F2F1", "#605E5C"],
};

const p = (pill: string): Cell => ({ pill });
const u = (person: string): Cell => ({ person });

const LISTS: ListDef[] = [
  {
    id: "milestones",
    title: "Key Milestones",
    modelTable: "Key Milestones",
    powers: "The Milestone Timeline, the AI Forecast Finish and the milestone slide in your SteerCo deck",
    columns: ["Title", "Workstream", "Owner", "Baseline Date", "Forecast Date", "Status"],
    rows: [
      ["Data Mapping Validated", "Config & Data Readiness", u("Dana Wells"), "5/18/2026", "5/18/2026", p("Complete")],
      ["Integration Test Cycle 1 Exit", "Integration", u("Marcus Lee"), "6/12/2026", "6/26/2026", p("Late")],
      ["UAT Scripts Approved", "Testing", u("Priya Shah"), "6/30/2026", "6/30/2026", p("On Track")],
      ["Super-User Training Complete", "Change & Training", u("Elena Cruz"), "7/10/2026", "7/17/2026", p("At Risk")],
      ["Go / No-Go Decision", "Cutover", u("Tom Becker"), "7/24/2026", "7/24/2026", p("On Track")],
    ],
  },
  {
    id: "raid",
    title: "RAID Log",
    modelTable: "RAID Log",
    powers: "The RAID Log, Decision Needed, the Risk Narrative and the RAID slide in your SteerCo deck",
    columns: ["ID #", "Title", "RAID Type", "Priority", "Status", "Workstream", "Owner", "Due Date", "Exclude from Status Report?"],
    rows: [
      ["R-014", "Legacy GL mappings incomplete for 3 entities", p("Risk"), p("High"), p("Open"), "Config & Data Readiness", u("Dana Wells"), "6/20/2026", p("No")],
      ["I-009", "SSO test tenant not provisioned", p("Issue"), p("Critical"), p("Blocked"), "Integration", u("Marcus Lee"), "6/14/2026", p("No")],
      ["D-004", "Approve phased cutover by region", p("Decision"), p("High"), p("Open"), "Cutover", u("Tom Becker"), "7/01/2026", p("No")],
      ["A-022", "Confirm UAT tester roster with practice leads", p("Action"), p("Medium"), p("Open"), "Testing", u("Priya Shah"), "6/24/2026", p("Yes")],
      ["R-011", "Training calendar overlaps busy season", p("Risk"), p("Low"), p("Closed"), "Change & Training", u("Elena Cruz"), "5/30/2026", p("No")],
    ],
  },
  {
    id: "status",
    title: "Weekly Status Updates",
    modelTable: "Weekly Status",
    powers: "Your health score and RAG status, the AI Executive Summary, the Weekly Change Summary and your podcast",
    columns: ["Week of", "Workstream", "Owner", "Internal Status", "External Status", "External Executive Summary"],
    rows: [
      ["6/15/2026", "Config & Data Readiness", u("Dana Wells"), p("At Risk"), p("On Track"), "Mapping 92% complete; two entities pending GL owner sign-off."],
      ["6/15/2026", "Integration", u("Marcus Lee"), p("Off Track"), p("At Risk"), "Cycle 1 exit moved two weeks; SSO tenant is the blocker."],
      ["6/15/2026", "Testing", u("Priya Shah"), p("On Track"), p("On Track"), "UAT scripts in final review; tester roster 80% confirmed."],
      ["6/15/2026", "Change & Training", u("Elena Cruz"), p("At Risk"), p("At Risk"), "Super-user sessions rescheduled around busy season."],
    ],
  },
  {
    id: "accomp",
    title: "Weekly Accomplishments & Next Steps",
    powers: "Kept in SharePoint today; can be added to the model for richer weekly summaries",
    columns: ["Workstream", "Update Type", "Title", "Status", "Target Date", "Completion Date", "Exclude from Status Report?"],
    rows: [
      ["Config & Data Readiness", p("Accomplishment"), "Loaded vendor master to QA", p("Closed"), "6/12/2026", "6/11/2026", p("No")],
      ["Integration", p("Next Step"), "Re-run payroll interface after SSO fix", p("Not Started"), "6/19/2026", "", p("No")],
      ["Testing", p("Accomplishment"), "Published UAT entry criteria", p("Closed"), "6/13/2026", "6/13/2026", p("No")],
      ["Change & Training", p("Next Step"), "Publish revised training calendar", p("In Progress"), "6/18/2026", "", p("Yes")],
    ],
  },
  {
    id: "deps",
    title: "Interdependencies",
    powers: "Kept in SharePoint today; tracks hand-offs between your workstreams",
    columns: ["ID #", "Title", "Status", "Due Date", "Provider Workstream", "Receiver Workstream", "Provider Owner", "Receiver Owner"],
    rows: [
      ["DEP-07", "Clean GL mapping file for interface build", p("In Progress"), "6/20/2026", "Config & Data Readiness", "Integration", u("Dana Wells"), u("Marcus Lee")],
      ["DEP-08", "SSO-enabled test tenant", p("At Risk"), "6/14/2026", "Integration", "Testing", u("Marcus Lee"), u("Priya Shah")],
      ["DEP-09", "Final process changes for training content", p("Not Started"), "6/27/2026", "Testing", "Change & Training", u("Priya Shah"), u("Elena Cruz")],
    ],
  },
  {
    id: "gov",
    title: "Governance Key Dictionary",
    powers: "Keeps workstream names consistent across your other lists, so the model can join them cleanly",
    columns: ["Workstream Code", "Workstream", "Practice Area", "Lead"],
    rows: [
      ["WS-01", "Config & Data Readiness", "Finance", u("Dana Wells")],
      ["WS-02", "Integration", "Technology", u("Marcus Lee")],
      ["WS-03", "Testing", "Technology", u("Priya Shah")],
      ["WS-04", "Change & Training", "People", u("Elena Cruz")],
      ["WS-05", "Cutover", "Operations", u("Tom Becker")],
    ],
  },
];

const STEPS = [
  { title: "SharePoint site", body: "Your project home, where your team works", tag: "/sites/elevate" },
  { title: "SharePoint Lists", body: "Your team updates status, milestones and RAID", tag: "6 lists" },
  { title: "Microsoft Fabric", body: "Refreshes from your lists every hour; adds AI insights", tag: "Elevate workspace" },
  { title: "Power BI semantic model", body: "One certified set of numbers behind every view", tag: "HorizonView model" },
  { title: "HorizonView", body: "This page, your SteerCo deck, podcast and Ask Horizon", tag: "No re-keying" },
];

function initials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function renderCell(c: Cell) {
  if (typeof c === "string") return c || <span className="text-[#A19F9D]">—</span>;
  if ("pill" in c) {
    const [bg, fg] = PILL[c.pill] ?? ["#F3F2F1", "#323130"];
    return (
      <span className="whitespace-nowrap rounded-full px-2 py-0.5 text-[0.72rem]" style={{ background: bg, color: fg }}>
        {c.pill}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0078D4] text-[0.55rem] font-semibold text-white">
        {initials(c.person)}
      </span>
      {c.person}
    </span>
  );
}

export interface Freshness {
  status: string;
  endTime: string | null;
}

function ago(mins: number) {
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  return h < 48 ? `${h} hr${h === 1 ? "" : "s"} ago` : `${Math.floor(h / 24)} days ago`;
}

/** Footnote on how fresh the data is, from the model's real refresh history. */
function FreshnessNote({ freshness, cadence, staleAfterMins }: { freshness: Freshness | null; cadence: string; staleAfterMins: number }) {
  // Times are formatted in the viewer's own time zone, after hydration.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const how = (
    <>
      This page reads the latest data from your HorizonView semantic model every time it opens, and checks again every
      5 minutes while it stays open. The model refreshes from your SharePoint lists{" "}
      <span className="font-medium">{cadence}</span>, so a change your team makes in SharePoint appears here after the
      next refresh.
    </>
  );

  if (!freshness) {
    return (
      <p className="text-[0.72rem] leading-relaxed text-hv-muted">
        {how} <span className="text-hv-subtle">The last refresh time is unavailable right now.</span>
      </p>
    );
  }
  const end = freshness.endTime ? Date.parse(freshness.endTime) : NaN;
  const mins = now != null && !Number.isNaN(end) ? Math.max(0, Math.round((now - end) / 60_000)) : null;
  const when = !Number.isNaN(end) && now != null
    ? new Date(end).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;
  const failed = /fail/i.test(freshness.status);
  const running = !freshness.endTime;
  const stale = mins != null && mins > staleAfterMins;

  let tone = "border-teal/40 bg-teal-tint/40 text-hv-text";
  let headline = <>Live data · last refreshed {when ?? "…"}{mins != null && <> ({ago(mins)})</>}</>;
  if (running) headline = <>Live data · a model refresh is running now</>;
  if (stale) {
    tone = "border-amber-500/50 bg-amber-50 text-hv-text";
    headline = <>Data may be out of date · the last refresh was {when} ({ago(mins!)}), longer than the usual schedule. Contact your Aberdeen team if this persists.</>;
  }
  if (failed) {
    tone = "border-red-500/40 bg-red-50 text-hv-text";
    headline = <>The latest refresh did not complete{when ? ` (${when})` : ""}. You are seeing data from the previous refresh.</>;
  }
  return (
    <div className={`rounded-lg border p-3 text-[0.72rem] leading-relaxed ${tone}`}>
      <div className="font-semibold">{headline}</div>
      <div className="mt-1 text-hv-muted">{how}</div>
    </div>
  );
}

export function SharePointLineage({
  siteUrl,
  freshness = null,
  cadence = "every hour",
  staleAfterMins = 120,
}: {
  siteUrl: string;
  freshness?: Freshness | null;
  cadence?: string;
  staleAfterMins?: number;
}) {
  const [active, setActive] = useState(LISTS[0].id);
  const list = LISTS.find((l) => l.id === active) ?? LISTS[0];
  const siteHost = siteUrl.replace(/^https?:\/\//, "");

  return (
    <section className="hv-card p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-hv-border pb-3">
        <h2 className="hv-kicker">Where this data comes from</h2>
        <a
          href={siteUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-hv-border px-3 py-1.5 text-[0.72rem] font-semibold text-navy transition hover:border-teal hover:text-teal-ink"
        >
          Open your Elevate SharePoint site ↗
        </a>
      </div>

      <p className="max-w-3xl text-sm font-light leading-relaxed text-hv-text">
        Project Elevate runs on your Microsoft 365 stack. Your team keeps status, milestones and the RAID log in{" "}
        <span className="font-medium">SharePoint Lists</span> on your Elevate project site.{" "}
        <span className="font-medium">Microsoft Fabric</span> refreshes those lists into your{" "}
        <span className="font-medium">HorizonView Power BI semantic model</span>, and everything on this page, plus your
        SteerCo deck, podcast and Ask Horizon answers, comes from that one certified model. Nobody re-keys a status
        report.
      </p>

      {/* Lineage strip */}
      <ol className="mt-6 grid gap-3 md:grid-cols-5">
        {STEPS.map((s, i) => (
          <li key={s.title} className="relative rounded-xl border border-hv-border bg-hv-bg p-4">
            <span className="hv-num text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-teal-ink">
              Step {i + 1}
            </span>
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

      {/* Example lists */}
      <h3 className="mt-8 text-sm font-semibold text-navy">Your SharePoint lists behind Elevate</h3>
      <p className="mt-1 text-[0.75rem] text-hv-muted">Example rows shown for illustration. Your live lists are on your Elevate site.</p>

      <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="SharePoint lists">
        {LISTS.map((l) => (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={active === l.id}
            onClick={() => setActive(l.id)}
            className={`rounded-full px-3 py-1.5 text-[0.72rem] font-medium transition ${
              active === l.id ? "bg-navy text-white" : "border border-hv-border text-navy hover:border-teal"
            }`}
          >
            {l.title}
            {l.modelTable && <span className="ml-1.5 text-teal-bright">●</span>}
          </button>
        ))}
      </div>

      {/* SharePoint-style list frame */}
      <div className="mt-4 overflow-hidden rounded-lg border border-[#E1DFDD] bg-white" style={{ fontFamily: '"Segoe UI", system-ui, sans-serif' }}>
        <div className="flex items-center gap-3 bg-[#036C70] px-4 py-2 text-[0.75rem] text-white">
          <span className="font-semibold">SharePoint</span>
          <span className="opacity-70">{siteHost}</span>
        </div>
        <div className="border-b border-[#EDEBE9] px-4 pb-2 pt-3">
          <div className="text-[0.7rem] text-[#605E5C]">Elevate</div>
          <div className="text-lg font-semibold text-[#323130]">{list.title}</div>
          <div className="mt-2 flex flex-wrap gap-4 text-[0.72rem] text-[#323130]">
            <span className="text-[#0078D4]">＋ New</span>
            <span>✎ Edit in grid view</span>
            <span>⇪ Share</span>
            <span>⤓ Export</span>
            <span>⚡ Automate</span>
            <span className="ml-auto text-[#605E5C]">All Items ⌄</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[0.78rem] text-[#323130]">
            <thead>
              <tr className="border-b border-[#EDEBE9]">
                {list.columns.map((c) => (
                  <th key={c} className="whitespace-nowrap px-3 py-2 font-semibold">
                    {c} <span className="text-[#A19F9D]">⌄</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.rows.map((r, i) => (
                <tr key={i} className="border-b border-[#F3F2F1] hover:bg-[#F3F2F1]">
                  {r.map((c, j) => (
                    <td key={j} className={`px-3 py-2 ${j === 0 || (typeof c === "string" && c.length > 40) ? "" : "whitespace-nowrap"}`}>
                      {renderCell(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* How this list connects */}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-hv-border bg-hv-bg p-3 text-[0.75rem]">
          <span className="font-semibold text-navy">Semantic model table: </span>
          {list.modelTable ? (
            <span className="hv-num text-hv-muted">&apos;{list.modelTable}&apos; (refreshed from this list)</span>
          ) : (
            <span className="text-hv-muted">Not yet in the model</span>
          )}
        </div>
        <div className="rounded-lg border border-hv-border bg-hv-bg p-3 text-[0.75rem]">
          <span className="font-semibold text-navy">{list.modelTable ? "Powers: " : "Role: "}</span>
          <span className="text-hv-muted">{list.powers}</span>
        </div>
      </div>
      <p className="mt-3 text-[0.68rem] text-hv-subtle">
        <span className="text-teal-bright">●</span> feeds this page today through the semantic model.
      </p>

      <div className="mt-5 border-t border-hv-border pt-4">
        <FreshnessNote freshness={freshness} cadence={cadence} staleAfterMins={staleAfterMins} />
      </div>
    </section>
  );
}
