# CRM Premium Redesign & Feature Overhaul — Working Plan

**Goal:** Turn the functional CRM into a premium, production-quality app (Linear/Attio/Stripe feel) with company-centric pipeline, Analytics, Contacts, Find Leads, merged Research workspace, Email workspace, Proposal builder, and demo data v2.

**Key decisions (locked):**
- `companies.stage` reuses the existing `deal_stage` enum; UI relabels `meeting_booked` → "Discovery", `negotiating` → "Negotiation". `stage_position` for kanban order. `companies.status` deprecated in UI (kept in DB).
- Pipeline cards = companies (always on board, default stage `new`); deals stay as revenue objects; card + column totals sum all deals per company.
- New tables: `leads` (AI discovery, status suggested/added/dismissed), `email_drafts`, `proposals` (content jsonb sections). `contacts.notes` added. `is_demo boolean` on companies + leads for one-click removal.
- Lead discovery: `/api/leads` — Claude + web_search server tool + zodOutputFormat, persisted, "Add Company" pre-fills the shared company dialog.
- Proposal PDF: print-optimized route + browser print (no heavy deps). Charts: recharts (React-19-compatible v3), guided by dataviz skill.
- Accent: indigo-family OKLCH accent over refined neutrals; stage/chart colors become CSS tokens; dark mode via next-themes (already installed).
- Nav: Dashboard, Analytics, Companies, Contacts, Pipeline, Find Leads, Settings — grouped sidebar, active states, cmd+k global search.

**Migration note:** Supabase CLI is NOT linked; `supabase/migrations/0002_pipeline_and_workspaces.sql` must be pasted into the Supabase SQL editor by the user (surface prominently at the end). Sequence code so `tsc`/build never depend on live DB.

**Phases (each leaves build green):**
1. Migration 0002 + hand-written types + constants relabel
2. Design foundation: globals.css tokens, ThemeProvider/toggle, AppSidebar, PageHeader/EmptyState/StatCard/StageBadge/ConfirmDialog, cmd+k SearchCommand, loading.tsx skeletons
3. Companies list (search/filter/sort, stage, revenue potential, last activity)
4. Company-centric pipeline kanban (`moveCompanyStage`, stage-change activity log)
5. Dashboard redesign
6. Analytics (server aggregates → recharts client components)
7. Contacts list + detail
8. Company detail restructure (Overview/Contacts/Activity/Research/Email/Proposal + breadcrumbs)
9. Research workspace merge (report + knowledge + Company Brain chat in one tab)
10. Email workspace (drafts table, custom instructions, edit/regenerate/save)
11. Proposal builder (/api/proposal SSE, section editor, print export)
12. Find Leads (/api/leads + page + prefilled add dialog)
13. Demo data v2 (5 companies, spread dates for analytics) + Remove Demo Data
14. Polish (states, dialogs, a11y) → verify (tsc, build, browser, check-rls) → docs

**Compound-loop invariant:** research reports must keep landing in documents/document_chunks; chat/email stay grounded in hybrid_search; prompts keep untrusted-data posture; handle refusal/pause_turn.
