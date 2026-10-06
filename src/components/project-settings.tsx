"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Project settings for projects kept in HorizonView: edit the details, or
// archive a finished project (it leaves the portfolio, but nothing is deleted).

const PHASES = ["Initiation", "Planning", "Design", "Build", "Test", "Deploy", "Hypercare"];
const field =
  "w-full rounded-lg border border-hv-border bg-white px-3 py-2 text-sm text-hv-text outline-none transition focus:border-teal focus:shadow-[0_0_0_3px_rgba(68,176,177,0.15)]";
const label = "mb-1 block text-[0.7rem] font-semibold uppercase tracking-wider text-hv-muted";

export interface SettingsProject {
  id: string;
  name: string;
  code: string;
  portfolio: string;
  phase: string;
  sponsor: string;
  projectManager: string;
  startDate: string;
  endDate: string;
  budget: number;
  description: string;
}

const dash = (v: string) => (v === "—" ? "" : v);

export function ProjectSettings({ project }: { project: SettingsProject }) {
  const router = useRouter();
  const initial = () => ({
    name: project.name,
    code: project.code,
    portfolio: project.portfolio,
    phase: PHASES.includes(project.phase) ? project.phase : "Initiation",
    sponsor: dash(project.sponsor),
    project_manager: dash(project.projectManager),
    start_date: project.startDate,
    end_date: project.endDate,
    budget: project.budget ? String(project.budget) : "",
    description: project.description,
  });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const set = (k: keyof ReturnType<typeof initial>) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy]);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save.");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!f.name.trim()) return setError("Project name is required.");
    if (f.end_date < f.start_date) return setError("Target finish must be on or after the start date.");
    const ok = await patch({ ...f, budget: f.budget === "" ? null : Number(f.budget.replace(/[$,\s]/g, "")) });
    if (ok) {
      setOpen(false);
      router.refresh();
    }
  }

  async function archive() {
    const ok = await patch({ archived: true });
    if (ok) {
      router.push("/portal");
      router.refresh();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setF(initial());
          setError(null);
          setConfirmArchive(false);
          setOpen(true);
        }}
        className="hv-btn whitespace-nowrap border-[1.5px] border-white/25 px-4 py-2 text-[0.82rem] text-white/85 transition hover:border-teal hover:text-white"
      >
        ⚙ Project settings
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-deep/50 p-4 pt-16" onClick={() => !busy && setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Project settings" className="w-full max-w-2xl rounded-hv bg-white p-6 shadow-hv-lg" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between border-b border-hv-border pb-3">
              <h2 className="text-lg font-bold text-navy">Project settings</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-xl leading-none text-hv-muted hover:text-navy" aria-label="Close" disabled={busy}>
                ×
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={label} htmlFor="ps-name">Project name</label>
                <input id="ps-name" className={field} value={f.name} onChange={set("name")} maxLength={120} />
              </div>
              <div>
                <label className={label} htmlFor="ps-program">Program</label>
                <input id="ps-program" className={field} value={f.portfolio} onChange={set("portfolio")} maxLength={80} />
              </div>
              <div>
                <label className={label} htmlFor="ps-code">Project code</label>
                <input id="ps-code" className={field} value={f.code} onChange={set("code")} maxLength={20} />
              </div>
              <div>
                <label className={label} htmlFor="ps-pm">Project manager</label>
                <input id="ps-pm" className={field} value={f.project_manager} onChange={set("project_manager")} maxLength={120} />
              </div>
              <div>
                <label className={label} htmlFor="ps-sponsor">Sponsor</label>
                <input id="ps-sponsor" className={field} value={f.sponsor} onChange={set("sponsor")} maxLength={120} />
              </div>
              <div>
                <label className={label} htmlFor="ps-start">Start date</label>
                <input id="ps-start" type="date" className={field} value={f.start_date} onChange={set("start_date")} />
              </div>
              <div>
                <label className={label} htmlFor="ps-end">Target finish</label>
                <input id="ps-end" type="date" className={field} value={f.end_date} min={f.start_date} onChange={set("end_date")} />
              </div>
              <div>
                <label className={label} htmlFor="ps-phase">Phase</label>
                <select id="ps-phase" className={field} value={f.phase} onChange={set("phase")}>
                  {PHASES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label} htmlFor="ps-budget">Budget ($)</label>
                <input id="ps-budget" className={field} value={f.budget} onChange={set("budget")} inputMode="decimal" placeholder="Optional" />
              </div>
              <div className="sm:col-span-2">
                <label className={label} htmlFor="ps-desc">Description</label>
                <textarea id="ps-desc" className={`${field} min-h-[64px]`} value={f.description} onChange={set("description")} maxLength={2000} />
              </div>
            </div>
            <p className="mt-3 text-[0.7rem] text-hv-subtle">
              Changing the dates here doesn&apos;t move existing tasks or milestones; adjust those in the plan tables.
            </p>

            {error && <p className="mt-3 rounded-lg border border-red-500/30 bg-red-50 p-3 text-sm text-red-300">{error}</p>}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-hv-border pt-4">
              {confirmArchive ? (
                <div className="flex flex-wrap items-center gap-2 text-[0.78rem] text-hv-text">
                  Archive {project.name}? It leaves the portfolio; its data is kept.
                  <button type="button" className="hv-btn border-[1.5px] border-red-500/40 bg-red-50 px-3 py-1.5 text-[0.75rem] font-semibold text-red-300" onClick={archive} disabled={busy}>
                    Yes, archive
                  </button>
                  <button type="button" className="text-[0.75rem] text-hv-muted underline" onClick={() => setConfirmArchive(false)} disabled={busy}>
                    Keep it
                  </button>
                </div>
              ) : (
                <button type="button" className="text-[0.78rem] font-semibold text-red-300 hover:underline" onClick={() => setConfirmArchive(true)} disabled={busy}>
                  Archive project…
                </button>
              )}
              <div className="flex gap-2">
                <button type="button" className="hv-btn-ghost" onClick={() => setOpen(false)} disabled={busy}>
                  Cancel
                </button>
                <button type="button" className="hv-btn-primary" onClick={save} disabled={busy}>
                  {busy ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
