"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PROJECT_TABLES, type ColDef, type TableDef } from "@/lib/project-tables";

// Capital Edge-style project workspace: tabs of editable tables stored in
// Supabase. Cells save on blur/change; every change is attributed to the
// signed-in user and recorded in the database's change log.

type Row = Record<string, any>;
interface Workstream { id: string; name: string }

const CAP = 15;

const pillTone: Record<string, string> = {
  "On Track": "bg-emerald-50 text-emerald-300", Complete: "bg-emerald-50 text-emerald-300", Completed: "bg-emerald-50 text-emerald-300", Closed: "bg-slate-100 text-slate-600",
  "At Risk": "bg-amber-50 text-amber-300", "In Progress": "bg-sky-50 text-sky-300", Medium: "bg-amber-50 text-amber-300",
  "Off Track": "bg-red-50 text-red-300", Late: "bg-red-50 text-red-300", Overdue: "bg-red-50 text-red-300", Blocked: "bg-red-50 text-red-300",
  Critical: "bg-red-50 text-red-300", High: "bg-orange-50 text-orange-700", Low: "bg-slate-100 text-slate-600",
  Open: "bg-sky-50 text-sky-300", "Not Started": "bg-slate-100 text-slate-600", Canceled: "bg-slate-100 text-slate-600",
};

const cellCls =
  "w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-[0.8rem] text-hv-text outline-none transition hover:border-hv-border hover:bg-white focus:border-teal focus:bg-white";

// Status/priority choices render as tinted pills (no transparent background to override the tint).
const pillCls =
  "w-full cursor-pointer rounded-full border border-transparent px-2 py-1 text-[0.74rem] font-semibold outline-none transition hover:border-hv-border focus:border-teal";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" }, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

function Cell({ col, row, workstreams, onSave }: {
  col: ColDef; row: Row; workstreams: Workstream[]; onSave: (key: string, value: unknown) => void;
}) {
  const v = row[col.key];
  if (col.readOnly) return <span className="hv-num px-1.5 text-[0.78rem] font-semibold text-navy">{v ?? "—"}</span>;
  switch (col.type) {
    case "select":
      return (
        <select value={v ?? ""} onChange={(e) => onSave(col.key, e.target.value)} aria-label={col.label}
          className={`${pillCls} ${pillTone[v] ?? "bg-slate-100 text-slate-600"}`}>
          {col.options!.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case "workstream":
      return (
        <select value={v ?? ""} onChange={(e) => onSave(col.key, e.target.value || null)} aria-label={col.label} className={`${cellCls} cursor-pointer`}>
          <option value="">{col.key === "workstream_id" ? "Project level" : "—"}</option>
          {workstreams.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      );
    case "date":
      return <input type="date" defaultValue={v ?? ""} key={`${row.id}-${v}`} aria-label={col.label}
        onChange={(e) => onSave(col.key, e.target.value || null)} className={`${cellCls} hv-num cursor-pointer`} />;
    case "bool":
      return <input type="checkbox" checked={!!v} onChange={(e) => onSave(col.key, e.target.checked)} aria-label={col.label} className="ml-2 accent-teal" />;
    case "int":
      return <input type="number" min={0} defaultValue={v ?? ""} key={`${row.id}-${v}`} aria-label={col.label}
        onBlur={(e) => e.target.value !== String(v ?? "") && onSave(col.key, e.target.value === "" ? null : Number(e.target.value))}
        className={`${cellCls} hv-num`} />;
    case "title":
      return <textarea defaultValue={v ?? ""} key={`${row.id}-${v}`} aria-label={col.label}
        rows={Math.min(4, Math.max(1, Math.ceil(String(v ?? "").length / 28)))}
        onBlur={(e) => e.target.value !== (v ?? "") && onSave(col.key, e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
        className={`${cellCls} resize-none font-medium leading-snug`} />;
    case "longtext":
      return <textarea defaultValue={v ?? ""} key={`${row.id}-${v}`} rows={Math.min(6, Math.max(2, Math.ceil(String(v ?? "").length / 34)))} aria-label={col.label}
        onBlur={(e) => e.target.value !== (v ?? "") && onSave(col.key, e.target.value)}
        className={`${cellCls} resize-y leading-snug`} />;
    default:
      return <input defaultValue={v ?? ""} key={`${row.id}-${v}`} aria-label={col.label}
        onBlur={(e) => e.target.value !== (v ?? "") && onSave(col.key, e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className={cellCls} />;
  }
}

function EditableTable({ projectId, def, workstreams, onChanged }: {
  projectId: string; def: TableDef; workstreams: Workstream[]; onChanged: () => void;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const base = `/api/data/${def.key}`;

  const load = useCallback(async () => {
    try {
      setError(null);
      const { rows } = await api<{ rows: Row[] }>(`${base}?project=${encodeURIComponent(projectId)}`);
      setRows(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load");
      setRows([]);
    }
  }, [base, projectId]);
  useEffect(() => { setRows(null); setQ(""); setExpanded(false); load(); }, [load]);

  async function run(fn: () => Promise<void>) {
    setSaving(true); setError(null);
    try { await fn(); setSavedAt(Date.now()); onChanged(); }
    catch (e) { setError(e instanceof Error ? e.message : "Save failed"); await load(); }
    finally { setSaving(false); }
  }

  const save = (id: string, key: string, value: unknown) => run(async () => {
    setRows((rs) => rs?.map((r) => (r.id === id ? { ...r, [key]: value } : r)) ?? rs);
    const { row } = await api<{ row: Row }>(base, { method: "PATCH", body: JSON.stringify({ project: projectId, id, patch: { [key]: value } }) });
    setRows((rs) => rs?.map((r) => (r.id === id ? row : r)) ?? rs);
  });

  const add = () => run(async () => {
    const { row } = await api<{ row: Row }>(base, { method: "POST", body: JSON.stringify({ project: projectId, row: {} }) });
    setRows((rs) => [row, ...(rs ?? [])]);
    setQ(""); setExpanded(true);
  });

  const remove = (id: string) => run(async () => {
    setConfirmId(null);
    setRows((rs) => rs?.filter((r) => r.id !== id) ?? rs);
    await api(`${base}?project=${encodeURIComponent(projectId)}&id=${id}`, { method: "DELETE" });
  });

  const filtered = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    const wsName = (id: string) => workstreams.find((w) => w.id === id)?.name ?? "";
    return rows.filter((r) =>
      [...def.searchKeys.map((k) => r[k]), wsName(r.workstream_id)].some((v) => String(v ?? "").toLowerCase().includes(needle)));
  }, [rows, q, def.searchKeys, workstreams]);
  const shown = expanded ? filtered : filtered.slice(0, CAP);
  const totalW = def.columns.reduce((s, c) => s + (c.width ?? 1), 0) + 0.7;

  return (
    <div>
      <p className="mb-3 text-[0.78rem] font-light text-hv-muted">{def.description}</p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={add} disabled={saving || rows === null}
          className="rounded-full bg-navy px-3 py-1.5 text-[0.72rem] font-semibold text-white transition hover:bg-azure disabled:opacity-50">
          + Add row
        </button>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" aria-label="Search"
          className="w-56 rounded-full border border-hv-border px-3 py-1.5 text-[0.75rem] outline-none focus:border-teal" />
        <span className="hv-num ml-auto text-[0.7rem] text-hv-subtle">
          {saving ? "Saving…" : savedAt ? "All changes saved" : rows ? `${filtered.length} row${filtered.length === 1 ? "" : "s"}` : "Loading…"}
        </span>
      </div>
      {error && <p className="mb-3 rounded border border-red-500/35 bg-red-50 px-3 py-2 text-xs text-red-300">{error}</p>}

      <div className={`hv-scroll-x rounded-lg border border-hv-border ${expanded ? "max-h-[600px] overflow-y-auto" : ""}`}>
        <table className="w-full table-fixed text-left" style={{ minWidth: `${Math.round(totalW * 92)}px` }}>
          <colgroup>
            {def.columns.map((c) => <col key={c.key} style={{ width: `${((c.width ?? 1) / totalW) * 100}%` }} />)}
            <col style={{ width: `${(0.7 / totalW) * 100}%` }} />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-hv-bg">
            <tr className="border-b border-hv-border text-[0.64rem] uppercase tracking-[0.08em] text-hv-subtle">
              {def.columns.map((c) => <th key={c.key} className="px-2 py-2 font-semibold">{c.label}</th>)}
              <th className="px-2 py-2 text-right font-semibold"> </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hv-border">
            {rows === null && <tr><td colSpan={def.columns.length + 1} className="py-6 text-center text-xs text-hv-subtle">Loading from Supabase…</td></tr>}
            {rows !== null && shown.length === 0 && (
              <tr><td colSpan={def.columns.length + 1} className="py-6 text-center text-xs text-hv-subtle">{q ? "No rows match your search." : "Nothing to display. Use “Add row” to start."}</td></tr>
            )}
            {shown.map((r) => (
              <tr key={r.id} className="align-top hover:bg-hv-bg/60">
                {def.columns.map((c) => (
                  <td key={c.key} className="px-1 py-1">
                    <Cell col={c} row={r} workstreams={workstreams} onSave={(k, v) => save(r.id, k, v)} />
                  </td>
                ))}
                <td className="px-2 py-1.5 text-right">
                  {confirmId === r.id ? (
                    <span className="inline-flex gap-1">
                      <button type="button" onClick={() => remove(r.id)} className="rounded-full bg-red-600 px-2 py-1 text-[0.65rem] font-semibold text-white">Delete</button>
                      <button type="button" onClick={() => setConfirmId(null)} className="rounded-full border border-hv-border px-2 py-1 text-[0.65rem] text-hv-muted">Keep</button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setConfirmId(r.id)} aria-label="Delete row" title="Delete row"
                      className="rounded-full border border-hv-border px-2 py-1 text-[0.65rem] text-hv-subtle transition hover:border-red-500/40 hover:text-red-600">✕</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length > CAP && (
        <button type="button" onClick={() => setExpanded((e) => !e)}
          className="mt-3 w-full rounded-full border border-hv-border py-2 text-[0.75rem] font-medium text-hv-muted transition hover:border-teal hover:text-teal-ink">
          {expanded ? "Show fewer" : `Show all ${filtered.length}`}
        </button>
      )}
    </div>
  );
}

export function ProjectDataWorkspace({ projectId, dashboardUrl }: { projectId: string; dashboardUrl?: string | null }) {
  const router = useRouter();
  const [tab, setTab] = useState(PROJECT_TABLES[0].key);
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadWorkstreams = useCallback(async () => {
    try {
      const { rows } = await api<{ rows: Row[] }>(`/api/data/workstreams?project=${encodeURIComponent(projectId)}`);
      setWorkstreams(rows.map((r) => ({ id: r.id, name: r.name })));
    } catch { /* table view shows its own error */ }
  }, [projectId]);
  useEffect(() => { loadWorkstreams(); }, [loadWorkstreams]);

  // After an edit, refresh the server-rendered parts of the page (timeline, KPIs) shortly after.
  const onChanged = useCallback(() => {
    if (tab === "workstreams") loadWorkstreams();
    // Let the Gantt chart (and anything else listening) reload straight away.
    window.dispatchEvent(new CustomEvent("hv-data-changed", { detail: { projectId, table: tab } }));
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => router.refresh(), 800);
  }, [tab, loadWorkstreams, router, projectId]);

  const def = PROJECT_TABLES.find((t) => t.key === tab)!;

  return (
    <section className="hv-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-hv-border pb-3">
        <h2 className="hv-kicker">Project data</h2>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[0.68rem] font-semibold text-emerald-300">● Live · Supabase</span>
          {dashboardUrl && (
            <a href={dashboardUrl} target="_blank" rel="noreferrer"
              className="rounded-full border border-hv-border px-3 py-1.5 text-[0.72rem] font-semibold text-navy transition hover:border-teal hover:text-teal-ink">
              Open dashboard ↗
            </a>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Project tables">
        {PROJECT_TABLES.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
            className={`rounded-full px-3 py-1.5 text-[0.72rem] font-medium transition ${tab === t.key ? "bg-navy text-white" : "border border-hv-border text-navy hover:border-teal"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <EditableTable key={def.key} projectId={projectId} def={def} workstreams={workstreams} onChanged={onChanged} />

      <p className="mt-4 border-t border-hv-border pt-3 text-[0.7rem] font-light text-hv-subtle">
        This project&apos;s data lives in a Supabase (Postgres) database, not SharePoint. Edits save as soon as you leave a
        cell, are attributed to your sign-in, and are recorded in the database&apos;s change history. The project dashboard
        reads the same tables, so changes appear there on its next refresh.
      </p>
    </section>
  );
}
