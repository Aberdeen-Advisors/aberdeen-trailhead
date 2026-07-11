import { getServiceToken } from "@/lib/msft/token";

// Microsoft Graph access (live mode) — SharePoint Lists and document libraries.

const GRAPH = "https://graph.microsoft.com/v1.0";

async function graphToken(): Promise<string> {
  return getServiceToken({
    tenantId: process.env.GRAPH_TENANT_ID!,
    clientId: process.env.GRAPH_CLIENT_ID!,
    clientSecret: process.env.GRAPH_CLIENT_SECRET!,
    scope: "https://graph.microsoft.com/.default",
  });
}

export async function graphGet<T>(path: string): Promise<T> {
  const token = await graphToken();
  const res = await fetch(`${GRAPH}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Graph GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

// Read items from a SharePoint list on the HorizonView site (e.g. RAID Log, Decisions).
export async function getSharePointListItems(listName: string): Promise<Record<string, unknown>[]> {
  const siteId = process.env.SHAREPOINT_SITE_ID!;
  const data = await graphGet<{ value: { fields: Record<string, unknown> }[] }>(
    `/sites/${siteId}/lists/${encodeURIComponent(listName)}/items?expand=fields&$top=500`
  );
  return data.value.map((i) => i.fields);
}
