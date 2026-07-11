import { getServiceToken } from "@/lib/msft/token";

// Microsoft Fabric REST API access (live mode).
// Used to trigger the AI production notebooks (executive summaries, risk
// scoring, forecasting, podcast generation) on demand or from cron.

const FABRIC = "https://api.fabric.microsoft.com/v1";

async function fabricToken(): Promise<string> {
  return getServiceToken({
    tenantId: process.env.POWERBI_TENANT_ID!,
    clientId: process.env.POWERBI_CLIENT_ID!,
    clientSecret: process.env.POWERBI_CLIENT_SECRET!,
    scope: "https://api.fabric.microsoft.com/.default",
  });
}

// Trigger a Fabric notebook run (e.g. the weekly AI insights notebook).
export async function runNotebook(notebookItemId: string): Promise<{ status: string; location?: string }> {
  const token = await fabricToken();
  const res = await fetch(
    `${FABRIC}/workspaces/${process.env.POWERBI_WORKSPACE_ID}/items/${notebookItemId}/jobs/instances?jobType=RunNotebook`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({}),
      cache: "no-store",
    }
  );
  if (!res.ok && res.status !== 202) {
    throw new Error(`Notebook run failed: ${res.status} ${await res.text()}`);
  }
  return { status: "accepted", location: res.headers.get("location") ?? undefined };
}
