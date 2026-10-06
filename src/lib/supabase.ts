// Server-only access to the HorizonView Supabase (Postgres) database.
//
// Only the HorizonView server talks to Supabase, using the project's secret
// key from the environment (never sent to the browser). Row-level security is
// on for every table with no policies, so the public/anon key can read nothing.

const URL_ = process.env.SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SECRET_KEY;

export const hasSupabase = (): boolean => !!(URL_ && KEY);

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { apikey: KEY!, "Content-Type": "application/json", ...extra };
  // Legacy service_role keys are JWTs and also go in the Authorization header.
  if (KEY!.startsWith("eyJ")) h.Authorization = `Bearer ${KEY}`;
  return h;
}

async function call<T>(method: string, path: string, body?: unknown, prefer?: string): Promise<T> {
  if (!hasSupabase()) throw new Error("Supabase is not configured (SUPABASE_URL / SUPABASE_SECRET_KEY).");
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    method,
    headers: headers(prefer ? { Prefer: prefer } : {}),
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase ${method} ${path.split("?")[0]} failed: ${res.status} ${await res.text()}`);
  if (res.status === 204) return [] as unknown as T;
  return (await res.json()) as T;
}

type Row = Record<string, unknown>;

/** Select rows. `query` is a PostgREST query string, e.g. "project_id=eq.alpha&order=due_date.asc". */
export const sbSelect = (table: string, query: string): Promise<Row[]> =>
  call<Row[]>("GET", `${table}?select=*${query ? `&${query}` : ""}`);

export const sbInsert = async (table: string, row: Row): Promise<Row> =>
  (await call<Row[]>("POST", table, row, "return=representation"))[0];

export const sbUpdate = async (table: string, filter: string, patch: Row): Promise<Row | undefined> =>
  (await call<Row[]>("PATCH", `${table}?${filter}`, patch, "return=representation"))[0];

export const sbDelete = (table: string, filter: string): Promise<Row[]> =>
  call<Row[]>("DELETE", `${table}?${filter}`, undefined, "return=representation");

/** Call a Postgres function exposed through PostgREST (e.g. hv_create_project). */
export const sbRpc = <T = unknown>(fn: string, args: Row): Promise<T> => call<T>("POST", `rpc/${fn}`, args);
