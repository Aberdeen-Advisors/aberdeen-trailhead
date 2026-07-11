import { getServiceToken } from "@/lib/msft/token";

// Power BI Semantic Model access (live mode).
// Uses the executeQueries REST API to run DAX against the certified
// HorizonView semantic model — the enterprise single source of truth.

const PBI_SCOPE = "https://analysis.windows.net/powerbi/api/.default";

async function pbiToken(): Promise<string> {
  return getServiceToken({
    tenantId: process.env.POWERBI_TENANT_ID!,
    clientId: process.env.POWERBI_CLIENT_ID!,
    clientSecret: process.env.POWERBI_CLIENT_SECRET!,
    scope: PBI_SCOPE,
  });
}

export async function executeDax<T>(dax: string): Promise<T[]> {
  const token = await pbiToken();
  const res = await fetch(
    `https://api.powerbi.com/v1.0/myorg/datasets/${process.env.POWERBI_DATASET_ID}/executeQueries`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        queries: [{ query: dax }],
        serializerSettings: { includeNulls: true },
      }),
      cache: "no-store",
    }
  );
  if (!res.ok) throw new Error(`executeQueries failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const rows: Record<string, unknown>[] = json.results?.[0]?.tables?.[0]?.rows ?? [];
  // DAX returns columns as "Table[Column]" — strip to bare column names.
  return rows.map((row) => {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      clean[k.replace(/^.*\[(.+)\]$/, "$1")] = v;
    }
    return clean as T;
  });
}

// Convenience: read a whole Intelligence Layer table surfaced in the semantic model.
// Adjust table names here to match your model (Projects, RAID, Milestones, ...).
export async function queryIntelligenceLayer<T>(table: string): Promise<T[]> {
  return executeDax<T>(`EVALUATE '${table}'`);
}
