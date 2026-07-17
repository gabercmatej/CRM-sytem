// Hand-written to match supabase/migrations/0001_init.sql + 0002_company_pipeline_leads_proposals.sql.
// After linking the Supabase CLI you can regenerate with:
//   npx supabase gen types typescript --linked > src/lib/database.types.ts

export type DealStage =
  | "new"
  | "researching"
  | "contacted"
  | "meeting_booked"
  | "proposal_sent"
  | "negotiating"
  | "won"
  | "lost";

export type ActivityType =
  | "email"
  | "call"
  | "meeting"
  | "note"
  | "task"
  | "ai_research"
  | "ai_email";

export type DocumentSource = "website" | "pdf" | "manual" | "research_report";
export type DocumentStatus = "pending" | "processing" | "ready" | "error";
export type ResearchStatus = "running" | "completed" | "error";
export type LeadStatus = "suggested" | "added" | "dismissed";
export type ProposalStatus = "draft" | "sent" | "accepted" | "declined";

type Timestamps = {
  created_at: string;
  updated_at: string;
};

/** User-tunable workspace preferences (workspaces.settings jsonb). */
export type WorkspaceSettings = {
  currency?: string;
  email_language?: string;
  follow_up_days?: number;
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  settings: WorkspaceSettings;
} & Timestamps;

export type WorkspaceMember = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

export type Company = {
  id: string;
  workspace_id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  country: string | null;
  linkedin_url: string | null;
  /** @deprecated superseded by `stage`; kept in the DB for compatibility. */
  status: string;
  stage: DealStage;
  stage_position: number;
  is_demo: boolean;
  notes: string | null;
  research_summary: string | null;
  last_researched_at: string | null;
} & Timestamps;

export type Contact = {
  id: string;
  workspace_id: string;
  company_id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  notes: string | null;
} & Timestamps;

export type Deal = {
  id: string;
  workspace_id: string;
  company_id: string;
  title: string;
  stage: DealStage;
  value: number | null;
  currency: string;
  expected_close: string | null;
  position: number;
} & Timestamps;

export type Activity = {
  id: string;
  workspace_id: string;
  company_id: string;
  contact_id: string | null;
  deal_id: string | null;
  type: ActivityType;
  subject: string;
  body: string | null;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type KbDocument = {
  id: string;
  workspace_id: string;
  company_id: string;
  source: DocumentSource;
  title: string;
  url: string | null;
  storage_path: string | null;
  status: DocumentStatus;
  error: string | null;
  created_at: string;
};

export type DocumentChunk = {
  id: string;
  workspace_id: string;
  document_id: string;
  company_id: string;
  content: string;
  embedding: string | null; // pgvector comes back as a string over PostgREST
  created_at: string;
};

export type ResearchRun = {
  id: string;
  workspace_id: string;
  company_id: string;
  status: ResearchStatus;
  report: ResearchReport | null;
  error: string | null;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
};

export type ChatConversation = {
  id: string;
  workspace_id: string;
  company_id: string;
  title: string;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  workspace_id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type Lead = {
  id: string;
  workspace_id: string;
  company_id: string | null;
  name: string;
  domain: string | null;
  industry: string | null;
  country: string | null;
  size: string | null;
  description: string | null;
  fit_reason: string | null;
  source_url: string | null;
  search_query: string | null;
  status: LeadStatus;
  is_demo: boolean;
  created_at: string;
};

export type EmailDraft = {
  id: string;
  workspace_id: string;
  company_id: string;
  contact_id: string | null;
  subject: string;
  body: string;
  goal: string;
  tone: string;
  language: string;
  instructions: string | null;
  status: "draft" | "sent";
} & Timestamps;

/** One editable section of a proposal (stored in proposals.content jsonb). */
export type ProposalSection = {
  id: string;
  title: string;
  body: string;
};

export type Proposal = {
  id: string;
  workspace_id: string;
  company_id: string;
  title: string;
  status: ProposalStatus;
  content: ProposalSection[];
} & Timestamps;

/** Structured output of the AI Research Agent (see src/lib/ai/schemas.ts). */
export type ResearchReport = {
  industry: string;
  summary: string;
  estimated_size: string;
  pain_points: string[];
  automation_opportunities: string[];
  suggested_services: string[];
  icebreakers: string[];
  recent_news: string[];
  tech_stack: string[];
  recommended_outreach_angle: string;
};

/**
 * `Generated` columns have DB defaults; like the real generated Supabase
 * types they stay optional on Insert (you may still supply them, e.g. demo
 * data with historical timestamps).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type TableDef<Row, Required extends keyof Row, _Generated extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Omit<Row, "id">>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      workspaces: TableDef<Workspace, "name" | "slug", "id" | "created_at" | "updated_at">;
      workspace_members: TableDef<
        WorkspaceMember,
        "workspace_id" | "user_id",
        "id" | "created_at"
      >;
      companies: TableDef<
        Company,
        "workspace_id" | "name",
        "id" | "created_at" | "updated_at"
      >;
      contacts: TableDef<
        Contact,
        "workspace_id" | "company_id" | "name",
        "id" | "created_at" | "updated_at"
      >;
      deals: TableDef<
        Deal,
        "workspace_id" | "company_id" | "title",
        "id" | "created_at" | "updated_at"
      >;
      activities: TableDef<
        Activity,
        "workspace_id" | "company_id" | "type" | "subject",
        "id" | "created_at"
      >;
      documents: TableDef<
        KbDocument,
        "workspace_id" | "company_id" | "source" | "title",
        "id" | "created_at"
      >;
      document_chunks: TableDef<
        DocumentChunk,
        "workspace_id" | "document_id" | "company_id" | "content",
        "id" | "created_at"
      >;
      research_runs: TableDef<
        ResearchRun,
        "workspace_id" | "company_id",
        "id" | "created_at"
      >;
      chat_conversations: TableDef<
        ChatConversation,
        "workspace_id" | "company_id",
        "id" | "created_at"
      >;
      chat_messages: TableDef<
        ChatMessage,
        "workspace_id" | "conversation_id" | "role" | "content",
        "id" | "created_at"
      >;
      leads: TableDef<Lead, "workspace_id" | "name", "id" | "created_at">;
      email_drafts: TableDef<
        EmailDraft,
        "workspace_id" | "company_id",
        "id" | "created_at" | "updated_at"
      >;
      proposals: TableDef<
        Proposal,
        "workspace_id" | "company_id",
        "id" | "created_at" | "updated_at"
      >;
    };
    Views: Record<string, never>;
    Functions: {
      hybrid_search: {
        Args: {
          p_company_id: string;
          p_query_text: string;
          p_query_embedding: string;
          p_match_count?: number;
        };
        Returns: {
          chunk_id: string;
          document_id: string;
          document_title: string;
          content: string;
          score: number;
        }[];
      };
    };
    Enums: {
      deal_stage: DealStage;
      activity_type: ActivityType;
      document_source: DocumentSource;
      document_status: DocumentStatus;
      research_status: ResearchStatus;
      lead_status: LeadStatus;
      proposal_status: ProposalStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
