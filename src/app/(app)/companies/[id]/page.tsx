import { notFound, redirect } from "next/navigation";
import { ExternalLink, Globe, MapPin, Users } from "lucide-react";
import { getAuthContext } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "./overview-tab";
import { ContactsTab } from "./contacts-tab";
import { ActivityTab } from "./activity-tab";
import { ResearchTab } from "./research-tab";
import { KnowledgeTab } from "./knowledge-tab";
import { ChatTab } from "./chat-tab";
import { EmailTab } from "./email-tab";

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

  const [{ data: contacts }, { data: deals }, { data: activities }, { data: runs }, { data: documents }, { data: conversation }] =
    await Promise.all([
      auth.supabase
        .from("contacts")
        .select("*")
        .eq("company_id", id)
        .order("created_at"),
      auth.supabase
        .from("deals")
        .select("*")
        .eq("company_id", id)
        .order("created_at"),
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
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{company.name}</h1>
            <Badge variant="secondary" className="capitalize">
              {company.status}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {company.domain && (
              <a
                href={`https://${company.domain}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <Globe className="size-3.5" /> {company.domain}
              </a>
            )}
            {company.industry && (
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5" /> {company.industry}
              </span>
            )}
            {company.country && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" /> {company.country}
              </span>
            )}
            {company.linkedin_url && (
              <a
                href={company.linkedin_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <ExternalLink className="size-3.5" /> LinkedIn
              </a>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">
            Contacts{contacts?.length ? ` (${contacts.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="research">Research</TabsTrigger>
          <TabsTrigger value="knowledge">
            Knowledge{documents?.length ? ` (${documents.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
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
          <ResearchTab company={company} runs={runs ?? []} />
        </TabsContent>
        <TabsContent value="knowledge" className="mt-4">
          <KnowledgeTab company={company} documents={documents ?? []} />
        </TabsContent>
        <TabsContent value="chat" className="mt-4">
          <ChatTab
            companyId={company.id}
            initialConversationId={conversation?.id ?? null}
            initialMessages={chatMessages}
          />
        </TabsContent>
        <TabsContent value="email" className="mt-4">
          <EmailTab companyId={company.id} contacts={contacts ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
