# HorizonView Gen 2 — Project Intelligence Platform

Microsoft-first, AI-enabled PPM portal built on **Next.js** and designed for **Vercel**, implementing the HorizonView Next Generation Architecture: Microsoft Fabric manufactures intelligence, SharePoint governs collaboration, the Power BI Semantic Model delivers trusted metrics, Onyx enables document understanding, and AI turns project data into executive-ready insights, decks, and briefings.

## What's included

| Capability | Where | Phase |
|---|---|---|
| Microsoft Entra ID login (Auth.js v5) | `src/auth.ts`, `middleware.ts` | 1 |
| Portfolio home with certified KPIs | `src/app/(portal)/page.tsx` | 1 |
| Project pages (health, RAID, milestones, AI insights) | `src/app/(portal)/projects/[id]` | 1–2 |
| Power BI dashboard links | `src/app/(portal)/dashboards` | 1 |
| Semantic Model DAX client (executeQueries) | `src/lib/msft/powerbi.ts` | 1 |
| Fabric notebook trigger (AI insights refresh) | `src/lib/msft/fabric.ts` | 2 |
| One-click SteerCo PowerPoint (PptxGenJS) | `src/lib/pptx/steering-deck.ts` | 3 |
| Document intelligence (tiered backends) | `src/lib/ai/documents.ts` | 4 |
| Ask Horizon agent (routed, cited answers) | `src/lib/ai/agent.ts`, `/ask` | 5 |
| Weekly cron for scheduled AI insights | `vercel.json`, `/api/cron/weekly-insights` | 6 |
| Podcast updates (Podcastfy via Fabric) | `/api/podcast`, `fabric/notebooks/generate_podcast.py` | 6 |

## Client tiers

Feature availability is controlled by one env var (`HV_TIER`); demo mode shows everything.

| Tier | Features | Incremental client cost drivers |
|---|---|---|
| **Core** | Portal, Power BI dashboards, SharePoint project sites/links | Vercel hosting only — no AI spend |
| **Intelligence** | + AI executive summaries, Ask Horizon (cited answers), one-click SteerCo decks | Azure OpenAI / OpenAI usage (cents per query/summary) |
| **Executive** | + "Build a Podcast Update" (Podcastfy in Fabric), scheduled AI reports | + TTS per episode (~$0.10–$0.50 OpenAI TTS; ElevenLabs premium; edge-tts free) + Fabric compute |

## Document intelligence (low-friction by design)

`searchDocuments()` in `src/lib/ai/documents.ts` auto-selects the cheapest backend the tenant supports — no page code changes:

1. **Graph Search API** (default) — free, works in every M365 tenant, reuses the portal's Graph credentials (`Sites.Read.All` application permission + `GRAPH_SEARCH_REGION`). Permission-aware SharePoint/OneDrive search.
2. **Copilot Retrieval API** — set `COPILOT_RETRIEVAL=true` for tenants that already own M365 Copilot licenses; returns RAG-optimized chunks from the Copilot index. Don't buy Copilot just for this.
3. **Onyx** (optional) — self-hosted fallback if a client already runs it (`ONYX_*` vars).
4. **Demo snippets** — no credentials.

## Podcast updates (Executive tier)

The "Build a Podcast Update" button on each project page calls `POST /api/podcast`:

- **Live:** triggers the Fabric notebook (`FABRIC_PODCAST_NOTEBOOK_ID`) — see the ready-to-adapt [`fabric/notebooks/generate_podcast.py`](fabric/notebooks/generate_podcast.py), which reads the project's Intelligence Layer insights, renders a two-host episode with [Podcastfy](https://github.com/souzatharsis/podcastfy), publishes MP3 + transcript to SharePoint, and writes `PodcastURL` back so the portal's audio player picks it up.
- **Demo:** generates the grounded two-host script in the portal so clients can see the workflow before paying for TTS.

## Demo mode vs live mode

The app runs out of the box in **demo mode**: no login, realistic mock portfolio (6 projects, RAID, milestones, AI narratives), a deterministic Ask Horizon, and full deck generation.

Set `HV_MODE=live` plus the credentials below to switch to live Microsoft data. Every data access goes through one seam — `src/lib/data/provider.ts` — so no page code changes when you flip modes.

## Quick start (local)

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Deploy to Vercel

1. Push this folder to a GitHub repo:
   ```bash
   git init && git add -A && git commit -m "HorizonView Gen 2"
   git remote add origin https://github.com/<you>/horizonview-portal.git
   git push -u origin main
   ```
2. In Vercel: **Add New Project → Import** the repo. Framework auto-detects Next.js. Deploy — it works immediately in demo mode.
3. To go live, add the environment variables from `.env.example` in **Project Settings → Environment Variables**, then redeploy.

## Going live: credential checklist

1. **Entra ID app registration** (portal.azure.com → App registrations)
   - Redirect URI (Web): `https://<your-domain>/api/auth/callback/microsoft-entra-id`
   - Set `AUTH_MICROSOFT_ENTRA_ID_ID/_SECRET/_ISSUER`, generate `AUTH_SECRET` (`npx auth secret`), set `HV_MODE=live`.
2. **Power BI / Fabric service principal**
   - Enable service principal access in the Power BI admin portal; grant it workspace access.
   - Set `POWERBI_*` vars. The portal reads Intelligence Layer tables via DAX `executeQueries` (`EVALUATE 'Projects'`, `'RAID'`, `'Milestones'` — rename in `src/lib/msft/powerbi.ts` to match your model).
3. **Microsoft Graph** — app permission `Sites.Read.All` for SharePoint lists + document search; set `GRAPH_*`, `SHAREPOINT_SITE_ID`, `GRAPH_SEARCH_REGION`. This alone enables document-grounded Ask Horizon answers.
4. **AI** — either `AZURE_OPENAI_*` or `OPENAI_API_KEY`. Enables LLM-grounded Ask Horizon answers (Intelligence tier).
5. **Tier** — set `HV_TIER` (`core` / `intelligence` / `executive`) per client contract; `FABRIC_PODCAST_NOTEBOOK_ID` for Executive tier.
6. **Cron** — set `CRON_SECRET` and `FABRIC_INSIGHTS_NOTEBOOK_ID` so the Monday cron triggers your Fabric AI notebook.

## Architecture map (code ⇄ spec)

```
Fabric (pipelines, notebooks)  →  src/lib/msft/fabric.ts     (trigger notebooks)
Intelligence Layer tables      →  src/lib/types.ts            (standard PPM model)
Power BI Semantic Model        →  src/lib/msft/powerbi.ts     (DAX executeQueries)
SharePoint Lists/Docs          →  src/lib/msft/graph.ts       (Graph API)
Document intelligence          →  src/lib/ai/documents.ts     (Graph Search / Copilot Retrieval / Onyx)
Azure OpenAI / OpenAI          →  src/lib/ai/openai.ts
Podcast updates (Podcastfy)    →  fabric/notebooks/generate_podcast.py + /api/podcast
Ask Horizon routing agent      →  src/lib/ai/agent.ts
Automated PPTX reporting       →  src/lib/pptx/steering-deck.ts
Presentation layer (Vercel)    →  src/app/(portal)/**
```

## Ask Horizon routing

- Structured questions ("How many red projects?") → Semantic Model
- Operational questions ("What decisions are overdue?") → SharePoint Lists
- Document questions ("What does the charter say about scope?") → document search (Graph Search / Copilot Retrieval)
- Combined questions ("Why is Project Alpha behind?") → all three, merged

Answers always carry citations; the agent is instructed never to answer beyond its grounding data.

## Roadmap notes

- **Teams/Email delivery:** extend the cron route with Graph `sendMail` / Teams webhooks.
- **Report Builder replacement:** add more deck types alongside `buildSteeringDeck` (QBR, budget review) — same pattern.
