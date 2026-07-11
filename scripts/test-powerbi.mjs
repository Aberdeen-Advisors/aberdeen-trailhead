// Standalone check of Power BI Semantic Model connectivity.
// Reads .env.local, gets a service-principal token, lists tables in the
// model, and pulls sample rows from the tables the portal uses.
//
//   node scripts/test-powerbi.mjs            → list tables + row samples
//   node scripts/test-powerbi.mjs "EVALUATE 'Projects'"  → run arbitrary DAX
//
// Requires: POWERBI_TENANT_ID, POWERBI_CLIENT_ID, POWERBI_CLIENT_SECRET,
//           POWERBI_DATASET_ID in .env.local

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// ── Load .env.local ───────────────────────────────────────────────────────────
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  console.error("No .env.local found — create it from .env.example first.");
  process.exit(1);
}

const need = ["POWERBI_TENANT_ID", "POWERBI_CLIENT_ID", "POWERBI_CLIENT_SECRET", "POWERBI_DATASET_ID"];
const missing = need.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("Missing env vars:", missing.join(", "));
  process.exit(1);
}

// ── Token ─────────────────────────────────────────────────────────────────────
const tokenRes = await fetch(
  `https://login.microsoftonline.com/${process.env.POWERBI_TENANT_ID}/oauth2/v2.0/token`,
  {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.POWERBI_CLIENT_ID,
      client_secret: process.env.POWERBI_CLIENT_SECRET,
      scope: "https://analysis.windows.net/powerbi/api/.default",
    }),
  }
);
if (!tokenRes.ok) {
  console.error("❌ Token request failed:", tokenRes.status, await tokenRes.text());
  process.exit(1);
}
const { access_token } = await tokenRes.json();
console.log("✅ Service principal token acquired.");

// ── DAX helper ────────────────────────────────────────────────────────────────
async function dax(query) {
  const res = await fetch(
    `https://api.powerbi.com/v1.0/myorg/datasets/${process.env.POWERBI_DATASET_ID}/executeQueries`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ queries: [{ query }], serializerSettings: { includeNulls: true } }),
    }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text}`);
  return JSON.parse(text).results?.[0]?.tables?.[0]?.rows ?? [];
}

// ── What can this service principal see? ─────────────────────────────────────
const wsRes = await fetch("https://api.powerbi.com/v1.0/myorg/groups", {
  headers: { Authorization: `Bearer ${access_token}` },
});
if (wsRes.ok) {
  const ws = (await wsRes.json()).value ?? [];
  if (!ws.length) {
    console.warn("⚠️ The app has access to NO workspaces. Add it to the Elevate workspace (Manage access → Member).");
  } else {
    for (const w of ws) {
      console.log(`✅ Workspace visible: ${w.name} (${w.id})`);
      const dsRes = await fetch(`https://api.powerbi.com/v1.0/myorg/groups/${w.id}/datasets`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (dsRes.ok)
        for (const d of (await dsRes.json()).value ?? [])
          console.log(`   dataset: ${d.name} (${d.id})${d.id === process.env.POWERBI_DATASET_ID ? "  ← matches .env.local" : ""}`);
    }
  }
} else {
  console.warn("⚠️ Could not list workspaces:", wsRes.status, (await wsRes.text()).slice(0, 200));
}

// ── Arbitrary query mode ──────────────────────────────────────────────────────
if (process.argv[2]) {
  console.log(await dax(process.argv[2]));
  process.exit(0);
}

// ── List tables ───────────────────────────────────────────────────────────────
let tables = [];
try {
  tables = (await dax("EVALUATE SELECTCOLUMNS(INFO.TABLES(), \"Name\", [Name])"))
    .map((r) => Object.values(r)[0])
    .filter((n) => !String(n).startsWith("DateTableTemplate") && !String(n).startsWith("LocalDateTable"));
  console.log("✅ Tables in model:", tables.join(", "));
} catch (e) {
  console.warn("⚠️ Could not list tables via INFO.TABLES():", e.message);
}

// ── Sample the tables the portal reads ───────────────────────────────────────
for (const t of ["Weekly Status", "RAID Log", "Key Milestones"]) {
  try {
    const rows = await dax(`EVALUATE TOPN(2, '${t}')`);
    console.log(`\n✅ '${t}' — ${rows.length ? "columns: " + Object.keys(rows[0]).map((k) => k.replace(/^.*\[(.+)\]$/, "$1")).join(", ") : "empty table"}`);
    if (rows[0]) console.log("   sample:", JSON.stringify(rows[0]).slice(0, 300));
  } catch (e) {
    console.error(`\n❌ '${t}' query failed:`, e.message.slice(0, 300));
  }
}
