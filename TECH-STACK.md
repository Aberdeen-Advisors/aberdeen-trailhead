# HorizonView Gen 2 — Tech Stack & How It Works

HorizonView is a **Project Intelligence Platform**, not a dashboard product. Microsoft Fabric manufactures intelligence, SharePoint governs collaboration and documents, Power BI delivers trusted metrics, and AI turns project data into executive-ready insights, decks, and audio briefings. This repo is the presentation and automation layer that sits on top.

---

## The stack at a glance

| Layer | Technology | Why |
|---|---|---|
| Web framework | **Next.js 14** (App Router) + **TypeScript** | Server-rendered pages, API routes, and UI in one deployable unit |
| Styling | **Tailwind CSS** | Fast, consistent executive-dark theme, no CSS sprawl |
| Hosting | **Vercel** | Zero-ops deploys from GitHub, built-in cron, per-branch previews |
| Authentication | **Microsoft Entra ID** via **Auth.js v5** | Clients sign in with their existing Microsoft 365 accounts; security inherited from M365 |
| Metrics | **Power BI Semantic Model** via REST `executeQueries` (DAX) | The certified single source of truth for KPIs |
| Data & AI engine | **Microsoft Fabric** (Lakehouse, Pipelines, Notebooks) via Fabric REST API | Ingests all source systems, runs the AI notebooks that produce insights |
| Collaboration | **SharePoint** via **Microsoft Graph** | Project sites, RAID lists, document libraries — never replaced, always linked |
| Document search | **Graph Search API** (default) / **Copilot Retrieval API** (upgrade) / Onyx (optional) | Lowest-friction first: free and tenant-native by default |
| AI | **Azure OpenAI** or **OpenAI API** (thin fetch client, no SDK) | Executive summaries, grounded Ask Horizon answers |
| PowerPoint generation | **PptxGenJS** (server-side) | One-click SteerCo decks, replacing Power BI Report Builder |
| Podcasts | **Podcastfy** running in a Fabric notebook | Two-host audio briefings, MP3 + transcript published to SharePoint |

---

## How the pieces fit

```
Source systems (SharePoint, Azure DevOps, Jira, SAP, SQL, Excel, ...)
        │  ingestion (pipelines/dataflows)
        ▼
Microsoft Fabric — Lakehouse / Warehouse
        │  AI notebooks (OpenAI): summaries, risk scores, forecasts, podcasts
        ▼
HorizonView Intelligence Layer  ← standardized tables (ProjectHealthScore,
        │                          ExecutiveSummary, RiskNarrative, PodcastURL, ...)
        ▼
Power BI Semantic Model  ← certified KPIs, DAX measures, business definitions
        │
        ├──► Power BI dashboards (interactive analysis)
        ├──► SharePoint sites (collaboration, documents, governance)
        └──► THIS PORTAL (Vercel) — executive home, Ask Horizon,
             one-click PPTX, podcast updates
```

**The key design rule:** every page and API route in this app reads data through one seam — `src/lib/data/provider.ts`. In demo mode the seam serves realistic mock data; in live mode it runs DAX against the Semantic Model. Nothing else in the codebase knows or cares which mode is active.

---

## How each feature works

**Portfolio home (`/`).** Server-rendered page pulls projects, RAID, and milestones through the provider, computes portfolio KPIs, and shows the AI-written weekly executive summary from the Intelligence Layer.

**Project pages (`/projects/[id]`).** One page per project: health/schedule/budget risk scores, AI executive summary, risk narrative, recommended actions, RAID table, milestones, decision-needed callout, and deep links to the project's SharePoint site and Power BI report. SharePoint remains the day-to-day collaboration home; the portal page is the premium intelligence view.

**Ask Horizon (`/ask`).** The agent classifies each question and routes it: metric questions → Semantic Model; operational questions (RAID, decisions, milestones) → SharePoint list data; document questions → document search; "why" questions → all three combined. It builds a grounding context, answers only from that context (LLM in live mode, deterministic in demo), and always returns citations. Code: `src/lib/ai/agent.ts`.

**One-click decks (`/reports`).** `POST`-free: a button hits `/api/reports/steering-deck`, which assembles the latest KPIs + AI insights and renders a branded PPTX with PptxGenJS — title, portfolio health, one slide per project (summary, risks, actions, milestones, decision), and a consolidated decisions table. The browser downloads the finished file. Code: `src/lib/pptx/steering-deck.ts`.

**Podcast updates (Executive tier).** The project-page button calls `/api/podcast`. Demo: generates the two-host script in-portal. Live: triggers the Fabric notebook (`fabric/notebooks/generate_podcast.py`), which reads the project's Intelligence Layer insights, renders audio with Podcastfy, publishes MP3 + transcript to SharePoint, and writes `PodcastURL` back — the portal's audio player picks it up automatically.

**Scheduled intelligence.** A Vercel cron (Mondays 12:00 UTC, `vercel.json`) calls `/api/cron/weekly-insights`, which triggers the Fabric AI-insights notebook so fresh summaries, scores, and forecasts are ready before the week starts.

---

## Demo mode vs live mode

| | Demo (default) | Live |
|---|---|---|
| Trigger | No env vars set | `HV_MODE=live` + Entra credentials |
| Login | Bypassed | Microsoft Entra ID sign-in required |
| Data | Mock portfolio (6 projects, RAID, milestones, AI narratives) | DAX against the Semantic Model |
| Ask Horizon | Deterministic grounded answers | LLM answers via Azure OpenAI/OpenAI |
| Documents | Curated snippets | Graph Search / Copilot Retrieval |
| Podcast | Script generated in-portal | Fabric + Podcastfy → MP3 on SharePoint |

Demo mode exists so the app deploys and sells itself with zero client setup; flipping to live is purely environment variables (see `.env.example`).

## Client tiers

Controlled by `HV_TIER`: **core** (portal + dashboards + SharePoint links; hosting cost only) → **intelligence** (+ AI insights, Ask Horizon, one-click PPTX; cents-per-query AI usage) → **executive** (+ podcast updates and scheduled AI reports; TTS ~$0.10–$0.50 per episode plus Fabric compute).

---

## Repo map

```
horizonview-portal/
├── src/app/(portal)/          Pages: portfolio home, projects/[id], dashboards, reports, ask
├── src/app/api/               ask · reports/steering-deck · podcast · cron/weekly-insights · auth
├── src/app/login/             Entra sign-in (demo bypass)
├── src/auth.ts, middleware.ts Auth.js v5 + route protection
├── src/lib/config.ts          Mode, capability, and tier detection (all env-driven)
├── src/lib/types.ts           The standard PPM model (Intelligence Layer contract)
├── src/lib/data/              provider.ts (the data seam) + demo-data.ts
├── src/lib/msft/              token.ts · powerbi.ts (DAX) · graph.ts · fabric.ts
├── src/lib/ai/                openai.ts · agent.ts (Ask Horizon) · documents.ts (search seam)
├── src/lib/pptx/              steering-deck.ts (PptxGenJS)
├── src/components/            Nav, KPI cards, chat, deck button, podcast panel
├── fabric/notebooks/          generate_podcast.py (Podcastfy reference notebook)
├── vercel.json                Weekly cron schedule
└── .env.example               Every variable, documented, grouped by capability
```

## Running and deploying

Local: `npm install` → `npm run dev` → http://localhost:3000 (demo mode, nothing to configure). Production check: `npm run build` → `npm start`. Deploy: push to GitHub, import into Vercel, done — add env vars from `.env.example` in Vercel project settings when a client goes live.
