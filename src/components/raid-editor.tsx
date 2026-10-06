"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RaidItem, RaidType } from "@/lib/types";

// Inline-editable RAID log. Cells look like text until focused; text fields save
// on blur, selects save on change. Saves are optimistic with rollback, so a
// failed request restores the previous value rather than leaving the row lying.

const TYPES: RaidType[] = ["Risk", "Assumption", "Issue", "Dependency", "Decision"];
const SEVERITIES: RaidItem["severity"][] = ["High", "Medium", "Low"];
const STATUSES: RaidItem["status"][] = ["Open", "In Progress", "Closed", "Overdue"];

const severityTone: Record<RaidItem["severity"], string> = {
  High: "text-red-300",
  Medium: "text-amber-300",
  Low: "text-hv-muted",
};

const statusTone: Record<RaidItem["status"], string> = {
  Overdue: "text-red-300",
  "In Progress": "text-sky-300",
  Open: "text-navy",
  Closed: "text-hv-subtle",
};

/** Borderless until hover/focus, so the table still reads as a report. */
const cell =
  "w-full rounded border border-transparent bg-transparent px-1.5 py-1 outline-none transition hover:border-hv-border hover:bg-hv-bg focus:border-teal focus:bg-white";

// Long logs stay readable: open items first, worst first, capped until expanded.
const CAP = 10;
const statusRank: Record<RaidItem["status"], number> = { Overdue: 0, Open: 1, "In Progress": 1, Closed: 2 };
const severityRank: Record<RaidItem["severity"], number> = { High: 0, Medium: 1, Low: 2 };

export function RaidEditor({
  projectId,
  items: initial,
  editable,
  sourceLabel,
  sourceUrl,
}: {
  projectId: string;
  items: RaidItem[];
  editable: boolean;
  /** Where the log really lives, e.g. "RAID Log" SharePoint list. Shown when read-only. */
  sourceLabel?: string;
  sourceUrl?: string;
}) {
  const [typeFilter, setTypeFilter] = useState<RaidType | "All">("All");
  const [openOnly, setOpenOnly] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Keep the table in step when the server component re-renders after a save.
  useEffect(() => setItems(initial), [initial]);

  const rollback = useRef<RaidItem[]>(initial);

  async function send(input: RequestInit & { url: string }): Promise<boolean> {
    setError(null);
    setBusy(true);
    try {
      const { url, ...init } = input;
      const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Save failed");
      }
      // Re-render the server component so decks and the portfolio page agree.
      router.refresh();
      return true;
    } catch (e) {
      setItems(rollback.current);
      setError(e instanceof Error ? e.message : "Save failed");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, field: keyof RaidItem, value: string) {
    const current = items.find((r) => r.id === id);
    if (!current || String(current[field] ?? "") === value) return;
    rollback.current = items;
    setItems((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    await send({
      url: "/api/raid",
      method: "PATCH",
      body: JSON.stringify({ id, [field]: value }),
    });
  }

  async function add() {
    rollback.current = items;
    const res = await fetch("/api/raid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        type: "Risk",
        title: "",
        severity: "Medium",
        owner: "Unassigned",
        status: "Open",
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not add the item");
      return;
    }
    const { item } = (await res.json()) as { item: RaidItem };
    setItems((rows) => [...rows, item]);
    setTypeFilter("All");
    setExpanded(true);
    router.refresh();
  }

  async function remove(id: string) {
    rollback.current = items;
    setItems((rows) => rows.filter((r) => r.id !== id));
    await send({ url: `/api/raid?id=${encodeURIComponent(id)}`, method: "DELETE" });
  }

  const overdue = items.filter((r) => r.status === "Overdue").length;
  const presentTypes = useMemo(() => TYPES.filter((t) => items.some((r) => r.type === t)), [items]);
  const visible = useMemo(
    () =>
      items
        .filter((r) => !openOnly || r.status !== "Closed")
        .filter((r) => typeFilter === "All" || r.type === typeFilter)
        .sort(
          (a, b) =>
            (statusRank[a.status] ?? 1) - (statusRank[b.status] ?? 1) ||
            (severityRank[a.severity] ?? 1) - (severityRank[b.severity] ?? 1) ||
            (a.dueDate || "").localeCompare(b.dueDate || "")
        ),
    [items, openOnly, typeFilter]
  );
  const shown = expanded ? visible : visible.slice(0, CAP);
  const chip = (on: boolean) =>
    `rounded-full px-3 py-1 text-[0.72rem] font-medium transition ${
      on ? "bg-navy text-white" : "border border-hv-border text-navy hover:border-teal"
    }`;

  return (
    <section className="hv-card p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-hv-border pb-3">
        <h2 className="hv-kicker">RAID Log</h2>
        <div className="flex items-center gap-3">
          <span className="hv-num text-[0.72rem] text-hv-muted">
            {items.length} item{items.length === 1 ? "" : "s"}
            {overdue > 0 && <span className="ml-1.5 font-semibold text-red-300">· {overdue} overdue</span>}
          </span>
          {!editable && sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-hv-border px-3 py-1.5 text-[0.72rem] font-semibold text-navy transition hover:border-teal hover:text-teal-ink"
            >
              Edit in SharePoint ↗
            </a>
          )}
          {editable && (
            <button
              type="button"
              onClick={add}
              disabled={busy}
              className="rounded-full bg-navy px-3 py-1.5 text-[0.72rem] font-semibold text-white transition hover:bg-azure disabled:opacity-50"
            >
              + Add item
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded border border-red-500/35 bg-red-50 px-3 py-2 text-xs text-red-300">{error}</p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <button type="button" className={chip(typeFilter === "All")} aria-pressed={typeFilter === "All"} onClick={() => { setTypeFilter("All"); setExpanded(false); }}>
          All types
        </button>
        {presentTypes.map((t) => (
          <button key={t} type="button" className={chip(typeFilter === t)} aria-pressed={typeFilter === t} onClick={() => { setTypeFilter(t); setExpanded(false); }}>
            {t}
            <span className="hv-num ml-1 opacity-60">
              {items.filter((r) => r.type === t && (!openOnly || r.status !== "Closed")).length}
            </span>
          </button>
        ))}
        <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-[0.72rem] text-hv-muted">
          <input type="checkbox" checked={openOnly} onChange={(e) => { setOpenOnly(e.target.checked); setExpanded(false); }} className="accent-teal" />
          Open items only
        </label>
      </div>

      <div className={`hv-scroll-x ${expanded ? "max-h-[560px] overflow-y-auto" : ""}`}>
        <table className="w-full min-w-[880px] table-fixed text-left text-sm">
          {/* Item takes the bulk of the width; the rest are sized to content. */}
          <colgroup>
            <col className="w-[12%]" />
            <col className="w-[37%]" />
            <col className="w-[10%]" />
            <col className="w-[13%]" />
            <col className="w-[12%]" />
            <col className="w-[11%]" />
            {editable && <col className="w-[5%]" />}
          </colgroup>
          <thead>
            <tr className="border-b border-hv-border text-[0.65rem] uppercase tracking-[0.1em] text-hv-subtle">
              <th className="pb-2.5 pr-3 font-semibold">Type</th>
              <th className="pb-2.5 pr-3 font-semibold">Item</th>
              <th className="pb-2.5 pr-3 font-semibold">Severity</th>
              <th className="pb-2.5 pr-3 font-semibold">Owner</th>
              <th className="pb-2.5 pr-3 font-semibold">Due</th>
              <th className="pb-2.5 pr-3 font-semibold">Status</th>
              {editable && <th className="pb-2.5 text-right font-semibold">Remove</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-hv-border">
            {visible.length === 0 && (
              <tr>
                <td colSpan={editable ? 7 : 6} className="py-6 text-center text-xs text-hv-subtle">
                  {items.length === 0
                    ? <>No RAID items yet.{editable && " Use “Add item” to create the first one."}</>
                    : "No items match these filters."}
                </td>
              </tr>
            )}
            {shown.map((r) => (
              <tr key={r.id} className="group align-middle transition hover:bg-hv-bg/60">
                <td className="py-1.5 pr-3">
                  {editable ? (
                    <select
                      value={r.type}
                      onChange={(e) => patch(r.id, "type", e.target.value)}
                      aria-label="Type"
                      className={`${cell} cursor-pointer text-xs font-semibold uppercase tracking-wider text-hv-subtle`}
                    >
                      {TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs font-semibold uppercase tracking-wider text-hv-subtle">{r.type}</span>
                  )}
                </td>

                <td className="py-1.5 pr-3">
                  {editable ? (
                    <input
                      defaultValue={r.title}
                      onBlur={(e) => patch(r.id, "title", e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                      placeholder="Describe the item…"
                      aria-label="Item"
                      className={`${cell} text-hv-text placeholder:text-hv-subtle`}
                    />
                  ) : (
                    <span className="text-hv-text">{r.title}</span>
                  )}
                </td>

                <td className="py-1.5 pr-3">
                  {editable ? (
                    <select
                      value={r.severity}
                      onChange={(e) => patch(r.id, "severity", e.target.value)}
                      aria-label="Severity"
                      className={`${cell} cursor-pointer text-xs font-semibold ${severityTone[r.severity]}`}
                    >
                      {SEVERITIES.map((sv) => (
                        <option key={sv} value={sv}>
                          {sv}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`text-xs font-semibold ${severityTone[r.severity]}`}>{r.severity}</span>
                  )}
                </td>

                <td className="py-1.5 pr-3">
                  {editable ? (
                    <input
                      defaultValue={r.owner}
                      onBlur={(e) => patch(r.id, "owner", e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                      aria-label="Owner"
                      className={`${cell} hv-num text-xs text-hv-muted`}
                    />
                  ) : (
                    <span className="hv-num text-xs text-hv-muted">{r.owner}</span>
                  )}
                </td>

                <td className="py-1.5 pr-3">
                  {editable ? (
                    <input
                      type="date"
                      defaultValue={r.dueDate}
                      onChange={(e) => e.target.value && patch(r.id, "dueDate", e.target.value)}
                      aria-label="Due date"
                      className={`${cell} hv-num cursor-pointer text-xs text-hv-muted`}
                    />
                  ) : (
                    <span className="hv-num text-xs text-hv-muted">{r.dueDate}</span>
                  )}
                </td>

                <td className="py-1.5 pr-3">
                  {editable ? (
                    <select
                      value={r.status}
                      onChange={(e) => patch(r.id, "status", e.target.value)}
                      aria-label="Status"
                      className={`${cell} cursor-pointer text-xs font-semibold ${statusTone[r.status]}`}
                    >
                      {STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`text-xs font-semibold ${statusTone[r.status]}`}>{r.status}</span>
                  )}
                </td>

                {editable && (
                  <td className="py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => remove(r.id)}
                      disabled={busy}
                      title="Delete item"
                      aria-label={`Delete ${r.title || "item"}`}
                      className="rounded-full border border-hv-border px-2 py-1 text-[0.7rem] font-semibold text-hv-subtle transition hover:border-red-500/40 hover:bg-red-50 hover:text-red-300 disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(visible.length > CAP) && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 w-full rounded-full border border-hv-border py-2 text-[0.75rem] font-medium text-hv-muted transition hover:border-teal hover:text-teal-ink"
        >
          {expanded ? "Show fewer" : `Show all ${visible.length}`}
        </button>
      )}

      <p className="mt-4 border-t border-hv-border pt-3 text-[0.7rem] font-light text-hv-subtle">
        {!editable && sourceLabel ? (
          <>
            Read-only. This log comes from your <span className="font-medium text-hv-muted">{sourceLabel}</span>{" "}
            SharePoint list through your Power BI semantic model. Edit items in SharePoint and they appear here after the
            next hourly refresh.
          </>
        ) : editable ? (
          <>
            Click any cell to edit; changes save automatically and flow through to portfolio decisions and
            generated SteerCo decks.
          </>
        ) : (
          <>Read-only: SharePoint Lists and the certified semantic model are the source of truth in live mode.</>
        )}
      </p>
    </section>
  );
}
