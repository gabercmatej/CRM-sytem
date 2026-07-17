# Setup Guide

Everything is built — you need ~15 minutes to connect the services. All of them have free tiers; the only pay-as-you-go cost is the Anthropic API (a few cents per research run).

## 1. Supabase (database + auth) — required

1. Go to [supabase.com](https://supabase.com) → **New project** (free tier is fine). Pick a strong database password and a region near you (e.g. `eu-central-1`).
2. When the project is ready, open **SQL Editor** → **New query**, paste the entire contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) and click **Run** ("Success. No rows returned"). Then open a second **New query** and run [`supabase/migrations/0002_company_pipeline_leads_proposals.sql`](supabase/migrations/0002_company_pipeline_leads_proposals.sql) the same way. Run migrations in order; each new file must be applied after the ones before it.
3. Open **Project Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)
4. Optional but recommended while testing: **Authentication → Sign In / Up → Email** → disable **Confirm email**, so signup logs you in immediately.

## 2. API keys

| Key | Where to get it | Needed for |
|---|---|---|
| `ANTHROPIC_API_KEY` | [platform.claude.com](https://platform.claude.com/settings/keys) | Research agent, chat, email drafts (required) |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com/api-keys) | Embeddings for semantic search (recommended — without it, search falls back to keyword-only) |
| `FIRECRAWL_API_KEY` | [firecrawl.dev](https://firecrawl.dev) | Website crawling into the knowledge base (recommended; free tier = 500 pages) |

## 3. Environment file

```bash
cp .env.example .env.local
```

Fill in the values from steps 1–2.

## 4. Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000 → **Sign up** (a private workspace is created automatically) → **Settings → Load demo data** → open a company → **Research** tab → *Research company* and watch the agent work.

## 5. The demo flow (for showing it to clients)

1. **Companies → New company** — enter a real company with its website domain.
2. **Research tab → Research company** — live agent feed, then the structured report (pain points, automation opportunities, icebreakers, outreach angle).
3. **Knowledge tab → Crawl website** — their whole site becomes searchable.
4. **Chat tab** — "What's their biggest problem we could solve?" — grounded answers with source badges.
5. **Email tab** — generate a personalized first-touch email (English or Slovene), copy to Gmail, *Log as sent* → a follow-up task appears on the Dashboard.
6. **Pipeline** — drag the deal through stages.

## 6. Verify security (multi-tenant isolation)

After setup, run:

```bash
node scripts/check-rls.mjs
```

It creates two throwaway users and verifies that user B cannot see user A's data (row-level security). Both test users are deleted afterwards.

## 7. Deploy to Vercel (optional)

1. Push this repo to GitHub, import it at [vercel.com](https://vercel.com).
2. Add all five environment variables from `.env.local` in the Vercel project settings.
3. In Supabase **Authentication → URL Configuration**, set the site URL to your Vercel domain.

Research runs stream for up to 5 minutes; this is configured via `maxDuration = 300` in the API routes (works on the Vercel Hobby plan with Fluid Compute, which is the default).

## Troubleshooting

- **A page errors with "column … does not exist"** → a migration hasn't been applied. Re-run the SQL files in `supabase/migrations/` in order (see step 1.2).
- **"Could not start research run" / empty pages** → check the Supabase keys and that the migrations ran.
- **Signup says "Check your email"** → email confirmation is on; either confirm via the email or disable it (step 1.4).
- **Research fails immediately** → `ANTHROPIC_API_KEY` missing or out of credit.
- **"Crawling unavailable"** → `FIRECRAWL_API_KEY` missing; the agent falls back to web search + page fetch.
- **Chat finds nothing** → the knowledge base is empty; run research or crawl the website first.
