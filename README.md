# AI-Native CRM

A CRM where AI does the heavy lifting before you ever pick up the phone:

- **CRM core** — companies, contacts, deals, activities, Kanban pipeline, dashboard
- **AI Research Agent** ⭐ — one click reads a company's website, searches recent news and produces pain points, automation opportunities, icebreakers and an outreach angle (streamed live)
- **Company Brain** — every company gets a knowledge base (website crawls, PDFs, notes, research reports) and a chat grounded in it, with source citations
- **AI email generator** — personalized outreach drafts (English/Slovene) grounded in the research; logging an email auto-schedules the follow-up
- **Multi-tenant by design** — every row is workspace-scoped with Postgres row-level security, so the same codebase can be deployed privately per client

## Stack

Next.js (App Router) · TypeScript · Tailwind + shadcn/ui · Supabase (Postgres, Auth, Storage, pgvector) · Anthropic Claude (research/chat/email) · OpenAI embeddings · Firecrawl (crawling) · hybrid vector+keyword search with RRF

## Getting started

See **[SETUP.md](SETUP.md)** — ~15 minutes: create a free Supabase project, run one SQL migration, add API keys, `npm run dev`.

## How the pieces fit

```
Research agent ──▶ structured report ──▶ knowledge base (chunks + embeddings)
      │                                        │
      ▼                                        ▼
 company record ◀──────────────── Company Brain chat / email generator
```

The compound loop is the point: everything the agent learns feeds retrieval, and everything you generate is grounded in what the system already knows.
