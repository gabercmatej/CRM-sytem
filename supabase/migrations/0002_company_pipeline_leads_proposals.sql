-- 0002 — Company-centric pipeline, leads, email drafts, proposals, demo markers.
-- Apply after 0001_init.sql (Supabase SQL editor or `supabase db push`).

-- ---------- new enums ----------
create type lead_status as enum ('suggested', 'added', 'dismissed');
create type proposal_status as enum ('draft', 'sent', 'accepted', 'declined');

-- ---------- companies: pipeline stage + kanban position + demo marker ----------
alter table companies
  add column if not exists stage deal_stage not null default 'new',
  add column if not exists stage_position double precision not null default 0,
  add column if not exists is_demo boolean not null default false;

create index if not exists companies_stage_idx on companies (workspace_id, stage);

-- Backfill stage from each company's most advanced non-lost deal.
with ranked as (
  select d.company_id,
         d.stage,
         row_number() over (
           partition by d.company_id
           order by case d.stage
             when 'won' then 7
             when 'negotiating' then 6
             when 'proposal_sent' then 5
             when 'meeting_booked' then 4
             when 'contacted' then 3
             when 'researching' then 2
             when 'new' then 1
             else 0
           end desc
         ) as rn
  from deals d
  where d.stage <> 'lost'
)
update companies c
set stage = r.stage
from ranked r
where r.company_id = c.id and r.rn = 1;

-- Companies whose every deal is lost land in 'lost'.
update companies c
set stage = 'lost'
where c.stage = 'new'
  and exists (select 1 from deals d where d.company_id = c.id)
  and not exists (select 1 from deals d where d.company_id = c.id and d.stage <> 'lost');

-- Stable kanban ordering for existing rows.
update companies
set stage_position = extract(epoch from created_at) * 1000
where stage_position = 0;

-- ---------- contacts: free-form notes ----------
alter table contacts add column if not exists notes text;

-- ---------- workspaces: user-tunable preferences ----------
-- { currency?: "EUR"|"USD", email_language?: "en"|"sl", follow_up_days?: number }
alter table workspaces
  add column if not exists settings jsonb not null default '{}'::jsonb;

-- ---------- leads: AI-discovered companies awaiting review ----------
create table leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  company_id uuid references companies (id) on delete set null,
  name text not null,
  domain text,
  industry text,
  country text,
  size text,
  description text,
  fit_reason text,
  source_url text,
  search_query text,
  status lead_status not null default 'suggested',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create index leads_workspace_status_idx on leads (workspace_id, status, created_at desc);

-- ---------- email drafts: persisted AI email workspace ----------
create table email_drafts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  contact_id uuid references contacts (id) on delete set null,
  subject text not null default '',
  body text not null default '',
  goal text not null default 'first_touch',
  tone text not null default 'professional',
  language text not null default 'en',
  instructions text,
  status text not null default 'draft' check (status in ('draft', 'sent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index email_drafts_company_idx on email_drafts (company_id, updated_at desc);

-- ---------- proposals: lightweight proposal builder ----------
create table proposals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  title text not null default 'Proposal',
  status proposal_status not null default 'draft',
  -- Array of { id, title, body } sections rendered by the builder/print view.
  content jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index proposals_company_idx on proposals (company_id, created_at desc);

-- ---------- updated_at triggers ----------
create trigger email_drafts_updated_at before update on email_drafts
  for each row execute function set_updated_at();

create trigger proposals_updated_at before update on proposals
  for each row execute function set_updated_at();

-- ---------- row-level security (same pattern as 0001) ----------
alter table leads enable row level security;
alter table email_drafts enable row level security;
alter table proposals enable row level security;

do $$
declare t text;
begin
  foreach t in array array['leads', 'email_drafts', 'proposals']
  loop
    execute format(
      'create policy "workspace members full access" on %I
       for all
       using (workspace_id in (
         select workspace_id from workspace_members
         where user_id = (select auth.uid())
       ))
       with check (workspace_id in (
         select workspace_id from workspace_members
         where user_id = (select auth.uid())
       ))', t);
  end loop;
end;
$$;
