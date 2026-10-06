"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// "+ New project": the details a PM or portfolio manager fills in once. The
// template then builds the workstreams, milestones and starter plan, dated
// from the start and finish dates, so the project is ready to run straight away.

export interface TemplateOption {
  id: string;
  name: string;
  description: string;
}

const PHASES = ["Initiation", "Planning", "Design", "Build", "Test", "Deploy", "Hypercare"];

const field =
  "w-full rounded-lg border border-hv-border bg-white px-3 py-2 text-sm text-hv-text outline-none transition focus:border-teal focus:shadow-[0_0_0_3px_rgba(68,176,177,0.15)]";
const label = "mb-1 block text-[0.72rem] font-semibold uppercase tracking-wider text-hv-muted";

export function NewProjectForm({ templates, programs }: { templates: TemplateOption[]; programs: string[] }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    name: "",
    portfolio: "",
    project_manager: "",
    sponsor: "",
    code: "",
    phase: "Initiation",
    start_date: today,
    end_date: "",
    budget: "",
    description: "",
    template_id: templates[0]?.id ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function submit() {
    setError(null);
    if (!f.name.trim()) return setError("Give the project a name.");
    if (!f.start_date || !f.end_date) return setError("Add a start date and a target finish date.");
    if (f.end_date < f.start_date) return setError("Target finish must be on or after the start date.");
    setBusy(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, budget: f.budget === "" ? null : Number(f.budget.replace(/[$,\s]/g, "")) }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error || "Could not create the project.");
      router.push(`/portal/projects/${encodeURIComponent(data.id)}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const tpl = templates.find((t) => t.id === f.template_id);

  return (
    <form
      className="hv-card grid gap-6 p-6 lg:grid-cols-[1fr_320px]"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label} htmlFor="np-name">Project name *</label>
          <input id="np-name" className={field} value={f.name} onChange={set("name")} placeholder="e.g. Acme Corp IT Integration" autoFocus maxLength={120} />
        </div>
        <div>
          <label className={label} htmlFor="np-program">Program</label>
          <input id="np-program" className={field} value={f.portfolio} onChange={set("portfolio")} placeholder="e.g. IT M&A Integrations" list="np-programs" maxLength={80} />
          <datalist id="np-programs">
            {programs.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={label} htmlFor="np-code">Project code</label>
          <input id="np-code" className={field} value={f.code} onChange={set("code")} placeholder="Optional, e.g. MNA-004" maxLength={20} />
        </div>
        <div>
          <label className={label} htmlFor="np-pm">Project manager</label>
          <input id="np-pm" className={field} value={f.project_manager} onChange={set("project_manager")} placeholder="Name" maxLength={120} />
        </div>
        <div>
          <label className={label} htmlFor="np-sponsor">Sponsor</label>
          <input id="np-sponsor" className={field} value={f.sponsor} onChange={set("sponsor")} placeholder="Name and role" maxLength={120} />
        </div>
        <div>
          <label className={label} htmlFor="np-start">Start date *</label>
          <input id="np-start" type="date" className={field} value={f.start_date} onChange={set("start_date")} />
        </div>
        <div>
          <label className={label} htmlFor="np-end">Target finish *</label>
          <input id="np-end" type="date" className={field} value={f.end_date} min={f.start_date} onChange={set("end_date")} />
        </div>
        <div>
          <label className={label} htmlFor="np-phase">Phase</label>
          <select id="np-phase" className={field} value={f.phase} onChange={set("phase")}>
            {PHASES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="np-budget">Budget ($)</label>
          <input id="np-budget" className={field} value={f.budget} onChange={set("budget")} placeholder="Optional, e.g. 1500000" inputMode="decimal" />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="np-desc">Description</label>
          <textarea id="np-desc" className={`${field} min-h-[72px]`} value={f.description} onChange={set("description")} placeholder="Optional: scope, acquired company, key dates" maxLength={2000} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <span className={label}>Start from</span>
          <div className="space-y-2">
            {templates.map((t) => (
              <label
                key={t.id}
                className={`block cursor-pointer rounded-xl border p-3 transition ${
                  f.template_id === t.id ? "border-teal bg-teal-tint/40" : "border-hv-border bg-white hover:border-teal"
                }`}
              >
                <span className="flex items-center gap-2">
                  <input type="radio" name="tpl" className="accent-teal" checked={f.template_id === t.id} onChange={() => setF((x) => ({ ...x, template_id: t.id }))} />
                  <span className="text-sm font-semibold text-navy">{t.name}</span>
                </span>
                <span className="mt-1 block text-[0.75rem] leading-snug text-hv-muted">{t.description}</span>
              </label>
            ))}
          </div>
        </div>
        <p className="rounded-lg bg-hv-bg p-3 text-[0.72rem] leading-relaxed text-hv-muted">
          {tpl
            ? `The ${tpl.name.toLowerCase()} template is spread across your start and finish dates. The PM can change any task, date or milestone afterwards.`
            : "Pick a template to start from."}{" "}
          Health and % complete are calculated from the plan as it's updated, and the project appears on the portfolio, AI summary, SteerCo deck and Ask Horizon straight away.
        </p>
        {error && <p className="rounded-lg border border-red-500/30 bg-red-50 p-3 text-sm text-red-300">{error}</p>}
        <div className="mt-auto flex gap-2">
          <button type="submit" className="hv-btn-primary flex-1" disabled={busy}>
            {busy ? "Creating…" : "Create project"}
          </button>
          <button type="button" className="hv-btn-ghost" onClick={() => router.push("/portal")} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
