// Shared rules for creating and editing projects kept in HorizonView.

export const PHASES = ["Initiation", "Planning", "Design", "Build", "Test", "Deploy", "Hypercare"] as const;

export interface ProjectInput {
  name?: string;
  code?: string;
  portfolio?: string;
  phase?: string;
  sponsor?: string;
  project_manager?: string;
  start_date?: string;
  end_date?: string;
  budget?: number | string | null;
  description?: string;
  template_id?: string;
}

const isDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);

/**
 * Validate and normalise project fields. `partial` allows a subset (edits).
 * Returns the clean values, or a plain-English error.
 */
export function checkProject(input: ProjectInput, partial = false): { value: Record<string, unknown> } | { error: string } {
  const out: Record<string, unknown> = {};
  const has = (k: keyof ProjectInput) => input[k] !== undefined;

  if (!partial || has("name")) {
    const name = clean(input.name, 120);
    if (!name) return { error: "Project name is required." };
    out.name = name;
  }
  for (const [k, max] of [["code", 20], ["portfolio", 80], ["sponsor", 120], ["project_manager", 120], ["description", 2000]] as const) {
    if (has(k)) out[k] = clean(input[k], max) || null;
  }
  if (has("phase")) {
    if (!PHASES.includes(String(input.phase) as (typeof PHASES)[number])) return { error: "Choose a phase from the list." };
    out.phase = input.phase;
  }
  if (!partial || has("start_date") || has("end_date")) {
    if (!partial || has("start_date")) {
      if (!isDate(input.start_date)) return { error: "Start date is required." };
      out.start_date = input.start_date;
    }
    if (!partial || has("end_date")) {
      if (!isDate(input.end_date)) return { error: "Target finish date is required." };
      out.end_date = input.end_date;
    }
    if (out.start_date && out.end_date && String(out.end_date) < String(out.start_date)) {
      return { error: "Target finish must be on or after the start date." };
    }
  }
  if (has("budget")) {
    const b = input.budget === "" || input.budget == null ? null : Number(input.budget);
    if (b != null && (!Number.isFinite(b) || b < 0)) return { error: "Budget must be a positive number." };
    out.budget = b;
  }
  return { value: out };
}
