-- ============================================================
-- AI-Native CRM — initial schema
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- ============================================================

create extension if not exists vector;

-- ---------- enums ----------
create type deal_stage as enum (
  'new', 'researching', 'contacted', 'meeting_booked',
  'proposal_sent', 'negotiating', 'won', 'lost'
);

create type activity_type as enum (
  'email', 'call', 'meeting', 'note', 'task', 'ai_research', 'ai_email'
);

create type document_source as enum ('website', 'pdf', 'manual', 'research_report');
create type document_status as enum ('pending', 'processing', 'ready', 'error');
create type research_status as enum ('running', 'completed', 'error');

-- ---------- tables ----------
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name text not null,
  domain text,
  industry text,
  size text,
  country text,
  linkedin_url text,
  status text not null default 'lead',
  notes text,
  research_summary text,
  last_researched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  name text not null,
  title text,
  email text,
  phone text,
  linkedin_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table deals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  title text not null,
  stage deal_stage not null default 'new',
  value numeric,
  currency text not null default 'EUR',
  expected_close date,
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  contact_id uuid references contacts (id) on delete set null,
  deal_id uuid references deals (id) on delete set null,
  type activity_type not null,
  subject text not null,
  body text,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  source document_source not null,
  title text not null,
  url text,
  storage_path text,
  status document_status not null default 'pending',
  error text,
  created_at timestamptz not null default now()
);

create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  document_id uuid not null references documents (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  content text not null,
  embedding vector(1536),
  fts tsvector generated always as (to_tsvector('english', content)) stored,
  created_at timestamptz not null default now()
);

create table research_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  status research_status not null default 'running',
  report jsonb,
  error text,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

create table chat_conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now()
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  conversation_id uuid not null references chat_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- ---------- indexes ----------
create index companies_workspace_idx on companies (workspace_id);
create index contacts_company_idx on contacts (company_id);
create index deals_company_idx on deals (company_id);
create index deals_stage_idx on deals (workspace_id, stage);
create index activities_company_idx on activities (company_id, created_at desc);
create index activities_due_idx on activities (workspace_id, due_at)
  where due_at is not null and completed_at is null;
create index documents_company_idx on documents (company_id);
create index chunks_company_idx on document_chunks (company_id);
create index chunks_embedding_idx on document_chunks
  using hnsw (embedding vector_cosine_ops);
create index chunks_fts_idx on document_chunks using gin (fts);
create index research_runs_company_idx on research_runs (company_id, created_at desc);
create index chat_messages_conv_idx on chat_messages (conversation_id, created_at);

-- ---------- updated_at trigger ----------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['workspaces', 'companies', 'contacts', 'deals']
  loop
    execute format(
      'create trigger %I_updated_at before update on %I
       for each row execute function set_updated_at()', t, t);
  end loop;
end;
$$;

-- ---------- signup bootstrap: workspace per new user ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_id uuid;
begin
  insert into workspaces (name, slug)
  values (
    coalesce(split_part(new.email, '@', 1), 'workspace') || '''s workspace',
    'ws-' || substr(new.id::text, 1, 8)
  )
  returning id into ws_id;

  insert into workspace_members (workspace_id, user_id, role)
  values (ws_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- row-level security ----------
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table companies enable row level security;
alter table contacts enable row level security;
alter table deals enable row level security;
alter table activities enable row level security;
alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table research_runs enable row level security;
alter table chat_conversations enable row level security;
alter table chat_messages enable row level security;

-- Members can read their own membership rows (no recursion: only auth.uid()).
create policy "members read own memberships"
  on workspace_members for select
  using (user_id = (select auth.uid()));

create policy "members read own workspaces"
  on workspaces for select
  using (id in (
    select workspace_id from workspace_members
    where user_id = (select auth.uid())
  ));

create policy "members update own workspaces"
  on workspaces for update
  using (id in (
    select workspace_id from workspace_members
    where user_id = (select auth.uid())
  ));

-- Every domain table gets the same full-access policy scoped by membership.
do $$
declare t text;
begin
  foreach t in array array[
    'companies', 'contacts', 'deals', 'activities', 'documents',
    'document_chunks', 'research_runs', 'chat_conversations', 'chat_messages'
  ]
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

-- ---------- private storage bucket for KB uploads ----------
insert into storage.buckets (id, name, public)
values ('kb-files', 'kb-files', false)
on conflict (id) do nothing;

-- ---------- hybrid search (vector + full-text, RRF fusion) ----------
create or replace function hybrid_search(
  p_company_id uuid,
  p_query_text text,
  p_query_embedding vector(1536),
  p_match_count int default 8
)
returns table (
  chunk_id uuid,
  document_id uuid,
  document_title text,
  content text,
  score double precision
)
language sql
stable
as $$
  with vector_results as (
    select c.id,
           row_number() over (order by c.embedding <=> p_query_embedding) as rank
    from document_chunks c
    where c.company_id = p_company_id
      and c.embedding is not null
    order by c.embedding <=> p_query_embedding
    limit 20
  ),
  text_results as (
    select c.id,
           row_number() over (
             order by ts_rank_cd(c.fts, websearch_to_tsquery('english', p_query_text)) desc
           ) as rank
    from document_chunks c
    where c.company_id = p_company_id
      and c.fts @@ websearch_to_tsquery('english', p_query_text)
    limit 20
  )
  select
    c.id as chunk_id,
    c.document_id,
    d.title as document_title,
    c.content,
    coalesce(1.0 / (60 + v.rank), 0) + coalesce(1.0 / (60 + t.rank), 0) as score
  from vector_results v
  full outer join text_results t on v.id = t.id
  join document_chunks c on c.id = coalesce(v.id, t.id)
  join documents d on d.id = c.document_id
  order by score desc
  limit p_match_count;
$$;
