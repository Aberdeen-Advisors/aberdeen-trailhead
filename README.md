# Aberdeen Advisors — Tr**AI**lhead + HorizonView Portal

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black.svg?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6.svg?logo=typescript&logoColor=white)
![Auth](https://img.shields.io/badge/Auth-Microsoft%20Entra%20SSO-0078D4.svg)
![Platform](https://img.shields.io/badge/Platform-Vercel-000000.svg?logo=vercel)

![Coffee Consumption](https://img.shields.io/badge/coffee-overflowing-brown?style=flat&logo=coffeescript)
![Status Meetings](https://img.shields.io/badge/status%20meetings-could've%20been%20a%20podcast-ff69b4)
![Scope Creep](https://img.shields.io/badge/scope%20creep-contained%20(for%20now)-orange)
![RAID Items](https://img.shields.io/badge/RAID%20items-multiplying-red)
![Executive Health](https://img.shields.io/badge/executive%20health-73%2F100%20%C2%B7%20hanging%20in%20there-yellow)
![SteerCo Decks](https://img.shields.io/badge/SteerCo%20decks-one%20click%2C%20zero%20tears-blueviolet)
![Demo Data](https://img.shields.io/badge/demo%20data-suspiciously%20green-brightgreen)
![Gantt Charts](https://img.shields.io/badge/gantt%20charts-in%20recovery-lightgrey)
![Buzzwords](https://img.shields.io/badge/buzzwords-AI--enabled%20(sorry)-purple)
![Project's Fuel](https://img.shields.io/badge/project's%20fuel-certified%20KPIs%20%2B%20snacks-important)

One deployment, two experiences:

1. **TrAIlhead** (public, at `/`) — Aberdeen's analytics and dashboarding showcase: live HTML recreations of five delivered dashboards (synthetic data), the five-layer platform architecture, an embedded CIO Hub branding video, and the domains served.
2. **HorizonView Portal** (secured, at `/portal`) — the Microsoft-first, AI-enabled Project Intelligence Platform: certified KPIs from the Power BI Semantic Model, AI executive summaries from Microsoft Fabric, RAID/milestones, Ask Horizon, one-click SteerCo decks, and podcast updates.

## How visitors enter the portal

Anyone can browse the Tr**AI**lhead site. In the top-right of the nav there's an **"Enter HorizonView Portal"** button:

1. Clicking it goes to `/portal`, which is protected by middleware — no session means an immediate redirect to the login page.
2. The login page has a single **Sign in with Microsoft** button that starts a Microsoft Entra ID (SSO) flow through the Aberdeen Advisors tenant.
3. The app registration is **single-tenant**: only `aberdeenadv.com` accounts (including invited B2B guests in the tenant) can sign in. Users already signed into M365 in their browser pass through silently; others get the standard Microsoft credential + MFA prompts.
4. After sign-in, users land on the Portfolio Home. A **Sign out** button next to the user's name in the nav ends the app session.

Access can be further restricted in Entra (Enterprise applications → HorizonView Portal → *Assignment required* + assigned users/groups) and hardened with Conditional Access / MFA policies — no code changes needed.

## Repository layout

```
public/home.html         — TrAIlhead single-page site (served at "/" via rewrite)
public/css, js, assets   — TrAIlhead brand system, SVG dashboard rendering, logos
public/CIOHubBrandingFinal.mp4 — CIO Hub branding video
public/project-logos/    — optional per-project logos (<project-id>.png)
src/middleware.ts        — protects /portal and data APIs; landing site stays public
src/auth.ts              — Auth.js v5 + Microsoft Entra ID provider
src/app/login/           — branded sign-in page (SSO button)
src/app/portal/**        — the secured portal (portfolio, projects, dashboards, reports, ask)
src/lib/**               — data provider seam, Power BI/Fabric/Graph clients, AI, PPTX
fabric/notebooks/        — Fabric notebook for podcast generation (Podcastfy)
push-to-github.bat       — commit + push helper (Vercel deploys from this repo)
```

## Portal capabilities

| Capability | Where | Phase |
|---|---|---|
| Microsoft Entra ID login (Auth.js v5) | `src/auth.ts`, `src/middleware.ts` | 1 |
| Portfolio home with certified KPIs | `src/app/portal/page.tsx` | 1 |
| Project pages (health, RAID, milestones, AI insights) | `src/app/portal/projects/[id]` | 1–2 |
| Power BI dashboard links | `src/app/portal/dashboards` | 1 |
| Semantic Model DAX client (executeQueries) | `src/lib/msft/powerbi.ts` | 1 |
| Fabric notebook trigger (AI insights refresh) | `src/lib/msft/fabric.ts` | 2 |
| One-click SteerCo PowerPoint (PptxGenJS) | `src/lib/pptx/steering-deck.ts` | 3 |
| Document intelligence (tiered backends) | `src/lib/ai/documents.ts` | 4 |
| Ask Horizon agent (routed, cited answers) | `src/lib/ai/agent.ts`, `/portal/ask` | 5 |
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

With no env vars, the app runs in **demo mode**: no login, realistic mock portfolio (6 projects, RAID, milestones, AI narratives), a deterministic Ask Horizon, and full deck generation.

Set `HV_MODE=live` plus Entra credentials to require Microsoft SSO. Data sources upgrade independently: until `POWERBI_*` is configured, the portal shows demo data behind the login. Every data access goes through one seam — `src/lib/data/provider.ts` — so no page code changes when you flip modes.

## Quick start (local)

```bash
npm install
npm run dev
# open http://localhost:3000        → TrAIlhead landing (public)
# open http://localhost:3000/portal → HorizonView portal (Microsoft SSO in live mode)
```

Copy `.env.example` to `.env.local` to configure live mode.

## Deploy (Vercel via GitHub)

This repo is `Aberdeen-Advisors/aberdeen-trailhead`; Vercel deploys from `main`. Run `push-to-github.bat` (or plain `git push`) to ship.

To go live in production:

1. Add the environment variables from `.env.example` in Vercel **Project Settings → Environment Variables** (at minimum: `HV_MODE`, `HV_TIER`, `AUTH_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_ID/_SECRET/_ISSUER`), then redeploy.
2. In the Entra app registration → Authentication, add the production redirect URI:
   `https://<your-domain>/api/auth/callback/microsoft-entra-id`

## Going live: credential checklist

1. **Entra ID app registration** (entra.microsoft.com → App registrations)
   - Single tenant; Redirect URI (Web): `https://<your-domain>/api/auth/callback/microsoft-entra-id` (+ `http://localhost:3000/...` for dev)
   - Set `AUTH_MICROSOFT_ENTRA_ID_ID/_SECRET/_ISSUER`, generate `AUTH_SECRET` (`npx auth secret`), set `HV_MODE=live`.
   - Client secrets expire (default 180 days) — calendar a rotation.
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
Presentation layer (Vercel)    →  src/app/portal/** + public/home.html
```

## Ask Horizon routing

- Structured questions ("How many red projects?") → Semantic Model
- Operational questions ("What decisions are overdue?") → SharePoint Lists
- Document questions ("What does the charter say about scope?") → document search (Graph Search / Copilot Retrieval)
- Combined questions ("Why is Project Alpha behind?") → all three, merged

Answers always carry citations; the agent is instructed never to answer beyond its grounding data.

## Tr**AI**lhead landing site notes

Plain HTML/CSS/JS — no framework, no build step, no chart libraries. All dashboard visuals are hand-rolled SVG rendered by `public/js/dashboards.js`. Only external dependency: Google Fonts (Poppins). Served at `/` through a Next.js rewrite to `public/home.html`, so it deploys with the portal as one project.

## Roadmap notes

- **Teams/Email delivery:** extend the cron route with Graph `sendMail` / Teams webhooks.
- **Report Builder replacement:** add more deck types alongside `buildSteeringDeck` (QBR, budget review) — same pattern.
- **Project logo upload:** logos currently ship as files in `public/project-logos/`; a portal upload UI backed by SharePoint is a natural next step.
