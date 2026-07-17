import { notFound, redirect } from "next/navigation";
import { ExternalLink, Globe, MapPin, Users } from "lucide-react";
import { getAuthContext } from "@/lib/supabase/server";
import { getWorkspaceSettings } from "@/lib/workspace-settings";
import { PageHeader } from "@/components/page-header";
import { StageBadge } from "@/components/stage-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "./overview-tab";
import { ContactsTab } from "./contacts-tab";
import { ActivityTab } from "./activity-tab";
import { ResearchWorkspace } from "./research-workspace";
import { EmailWorkspace } from "./email-workspace";
import { ProposalWorkspace } from "./proposal-workspace";

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const { data: company } = await auth.supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();

  if (!company) notFound();

  const [
    { data: contacts },
    { data: deals },
    { data: activities },
    { data: runs },
    { data: documents },
    { data: conversation },
    { data: drafts },
    { data: proposals },
    settings,
  ] = await Promise.all([
    auth.supabase.from("contacts").select("*").eq("company_id", id).order("created_at"),
    auth.supabase.from("deals").select("*").eq("company_id", id).order("created_at"),
    auth.supabase
      .from("activities")
      .select("*")
      .eq("company_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    auth.supabase
      .from("research_runs")
      .select("*")
      .eq("company_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
    auth.supabase
      .from("documents")
      .select("*")
      .eq("company_id", id)
      .order("created_at", { ascending: false }),
    auth.supabase
      .from("chat_conversations")
      .select("id")
      .eq("company_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    auth.supabase
      .from("email_drafts")
      .select("*")
      .eq("company_id", id)
      .order("updated_at", { ascending: false })
      .limit(20),
    auth.supabase
      .from("proposals")
      .select("*")
      .eq("company_id", id)
      .order("updated_at", { ascending: false })
      .limit(10),
    getWorkspaceSettings(auth.supabase, auth.workspaceId),
  ]);

  const { data: rawChatMessages } = conversation
    ? await auth.supabase
        .from("chat_messages")
        .select("role, content")
        .eq("conversation_id", conversation.id)
        .order("created_at")
    : { data: [] };

  const chatMessages = (rawChatMessages ?? []).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        backHref="/companies"
        backLabel="Companies"
        title={
          <span className="flex flex-wrap items-center gap-3">
            {company.name}
            <StageBadge stage={company.stage} />
          </span>
        }
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {company.domain && (
            <a
              href={`https://${company.domain}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <Globe className="size-3.5" aria-hidden /> {company.domain}
            </a>
          )}
          {company.industry && (
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" aria-hidden /> {company.industry}
            </span>
          )}
          {company.country && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden /> {company.country}
            </span>
          )}
          {company.linkedin_url && (
            <a
              href={company.linkedin_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <ExternalLink className="size-3.5" aria-hidden /> LinkedIn
            </a>
          )}
        </div>
      </PageHeader>

      <Tabs defaultValue="overview">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">
            Contacts{contacts?.length ? ` (${contacts.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="research">Research</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="proposal">
            Proposal{proposals?.length ? ` (${proposals.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab company={company} deals={deals ?? []} />
        </TabsContent>
        <TabsContent value="contacts" className="mt-4">
          <ContactsTab companyId={company.id} contacts={contacts ?? []} />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ActivityTab
            companyId={company.id}
            activities={activities ?? []}
            contacts={contacts ?? []}
          />
        </TabsContent>
        <TabsContent value="research" className="mt-4">
          <ResearchWorkspace
            company={company}
            runs={runs ?? []}
            documents={documents ?? []}
            initialConversationId={conversation?.id ?? null}
            initialMessages={chatMessages}
          />
        </TabsContent>
        <TabsContent value="email" className="mt-4">
          <EmailWorkspace
            companyId={company.id}
            contacts={contacts ?? []}
            drafts={drafts ?? []}
            defaultLanguage={settings.email_language}
            followUpDays={settings.follow_up_days}
          />
        </TabsContent>
        <TabsContent value="proposal" className="mt-4">
          <ProposalWorkspace
            companyId={company.id}
            companyName={company.name}
            proposals={proposals ?? []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
