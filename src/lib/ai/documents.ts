import { getServiceToken } from "@/lib/msft/token";
import { demoDocuments } from "@/lib/data/demo-data";

// ── Document intelligence seam ───────────────────────────────────────────────
// One function the rest of the app calls: searchDocuments().
// Backend is chosen by configuration, lowest-friction first:
//   1. Copilot Retrieval API — best RAG chunks; requires M365 Copilot licensing.
//      Enable with COPILOT_RETRIEVAL=true (uses GRAPH_* credentials).
//   2. Microsoft Graph Search API — free, every M365 tenant, permission-aware,
//      no extra infrastructure. Used automatically when GRAPH_* creds exist.
//   3. Onyx — optional self-hosted backend (ONYX_BASE_URL + ONYX_API_KEY).
//   4. Demo snippets — no credentials at all.

export interface DocumentHit {
  document: string;
  snippet: string;
  url?: string;
}

const hasGraphCreds = () =>
  !!(process.env.GRAPH_TENANT_ID && process.env.GRAPH_CLIENT_ID && process.env.GRAPH_CLIENT_SECRET);

async function graphToken(): Promise<string> {
  return getServiceToken({
    tenantId: process.env.GRAPH_TENANT_ID!,
    clientId: process.env.GRAPH_CLIENT_ID!,
    clientSecret: process.env.GRAPH_CLIENT_SECRET!,
    scope: "https://graph.microsoft.com/.default",
  });
}

// 1. Copilot Retrieval API — chunks from the index that powers M365 Copilot.
async function copilotRetrieval(query: string): Promise<DocumentHit[]> {
  const token = await graphToken();
  const res = await fetch("https://graph.microsoft.com/v1.0/copilot/retrieval", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      queryString: query,
      dataSource: "sharePoint",
      maximumNumberOfResults: 5,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Copilot Retrieval failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const hits: { webUrl?: string; resourceMetadata?: { title?: string }; extracts?: { text?: string }[] }[] =
    json.retrievalHits ?? [];
  return hits.map((h) => ({
    document: h.resourceMetadata?.title ?? h.webUrl ?? "document",
    snippet: h.extracts?.map((e) => e.text).filter(Boolean).join(" … ") ?? "",
    url: h.webUrl,
  }));
}

// 2. Graph Search API — standard M365 search over SharePoint/OneDrive content.
//    App-only requires Sites.Read.All (application) and a region value.
async function graphSearch(query: string): Promise<DocumentHit[]> {
  const token = await graphToken();
  const res = await fetch("https://graph.microsoft.com/v1.0/search/query", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          entityTypes: ["driveItem", "listItem"],
          query: { queryString: query },
          from: 0,
          size: 5,
          region: process.env.GRAPH_SEARCH_REGION ?? "NAM",
        },
      ],
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Graph search failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const hits: { summary?: string; resource?: { name?: string; webUrl?: string } }[] =
    json.value?.[0]?.hitsContainers?.[0]?.hits ?? [];
  return hits.map((h) => ({
    document: h.resource?.name ?? "document",
    snippet: (h.summary ?? "").replace(/<\/?c0>|<ddd\/>/g, ""),
    url: h.resource?.webUrl,
  }));
}

// 3. Onyx (optional, self-hosted).
async function onyxSearch(query: string): Promise<DocumentHit[]> {
  const res = await fetch(`${process.env.ONYX_BASE_URL!.replace(/\/$/, "")}/api/query/answer-with-quote`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.ONYX_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ message: query, role: "user" }] }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Onyx query failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const docs: { semantic_identifier?: string; blurb?: string; link?: string }[] = json.top_documents ?? [];
  return docs.slice(0, 5).map((d) => ({
    document: d.semantic_identifier ?? "document",
    snippet: d.blurb ?? "",
    url: d.link,
  }));
}

// 4. Demo snippets — keyword match over curated content.
function demoSearch(query: string, projectId?: string): DocumentHit[] {
  const q = query.toLowerCase();
  return demoDocuments
    .filter((d) => !projectId || d.projectId === projectId)
    .filter(
      (d) =>
        d.snippet.toLowerCase().split(/\W+/).some((w) => w.length > 3 && q.includes(w)) ||
        q.split(/\W+/).some((w) => w.length > 3 && d.snippet.toLowerCase().includes(w))
    )
    .slice(0, 3)
    .map((d) => ({ document: d.doc, snippet: d.snippet }));
}

export function documentBackend(): "copilot" | "graph-search" | "onyx" | "demo" {
  if (process.env.COPILOT_RETRIEVAL === "true" && hasGraphCreds()) return "copilot";
  if (hasGraphCreds()) return "graph-search";
  if (process.env.ONYX_BASE_URL && process.env.ONYX_API_KEY) return "onyx";
  return "demo";
}

export async function searchDocuments(query: string, projectId?: string): Promise<DocumentHit[]> {
  switch (documentBackend()) {
    case "copilot":
      return copilotRetrieval(query);
    case "graph-search":
      return graphSearch(query);
    case "onyx":
      return onyxSearch(query);
    default:
      return demoSearch(query, projectId);
  }
}
