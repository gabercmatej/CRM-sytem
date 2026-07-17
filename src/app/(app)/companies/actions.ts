"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/server";
import { getWorkspaceSettings } from "@/lib/workspace-settings";
import { STAGE_LABELS } from "@/lib/constants";
import type {
  ActivityType,
  DealStage,
  ProposalSection,
  ProposalStatus,
} from "@/lib/database.types";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

// ---------- companies ----------

export async function createCompany(formData: FormData) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const name = str(formData, "name");
  if (!name) return;

  const { data, error } = await auth.supabase
    .from("companies")
    .insert({
      workspace_id: auth.workspaceId,
      name,
      domain: str(formData, "domain")?.replace(/^https?:\/\//, "").replace(/\/.*$/, "") ?? null,
      industry: str(formData, "industry"),
      size: str(formData, "size"),
      country: str(formData, "country"),
      linkedin_url: str(formData, "linkedin_url"),
      notes: str(formData, "notes"),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/companies");
  revalidatePath("/pipeline");
  redirect(`/companies/${data.id}`);
}

export async function updateCompany(companyId: string, formData: FormData) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const { error } = await auth.supabase
    .from("companies")
    .update({
      name: str(formData, "name") ?? undefined,
      domain: str(formData, "domain")?.replace(/^https?:\/\//, "").replace(/\/.*$/, "") ?? null,
      industry: str(formData, "industry"),
      size: str(formData, "size"),
      country: str(formData, "country"),
      linkedin_url: str(formData, "linkedin_url"),
      stage: (str(formData, "stage") as DealStage | null) ?? undefined,
      notes: str(formData, "notes"),
    })
    .eq("id", companyId)
    .eq("workspace_id", auth.workspaceId);

  if (error) throw new Error(error.message);
  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/companies");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
}

export async function deleteCompany(companyId: string) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  // Cascades to contacts, deals, activities, documents, chunks, chats (FKs).
  const { error } = await auth.supabase
    .from("companies")
    .delete()
    .eq("id", companyId)
    .eq("workspace_id", auth.workspaceId);

  if (error) throw new Error(error.message);
  revalidatePath("/companies");
  redirect("/companies");
}

// ---------- contacts ----------

export async function createContact(companyId: string, formData: FormData) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const name = str(formData, "name");
  if (!name) return;

  const { error } = await auth.supabase.from("contacts").insert({
    workspace_id: auth.workspaceId,
    company_id: companyId,
    name,
    title: str(formData, "title"),
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    linkedin_url: str(formData, "linkedin_url"),
    notes: str(formData, "notes"),
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/contacts");
}

/** Create a contact from the global Contacts page (company picked in the form). */
export async function createContactGlobal(formData: FormData) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const name = str(formData, "name");
  const companyId = str(formData, "company_id");
  if (!name || !companyId) return;

  const { error } = await auth.supabase.from("contacts").insert({
    workspace_id: auth.workspaceId,
    company_id: companyId,
    name,
    title: str(formData, "title"),
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    linkedin_url: str(formData, "linkedin_url"),
    notes: str(formData, "notes"),
  });

  if (error) throw new Error(error.message);
  revalidatePath("/contacts");
  revalidatePath(`/companies/${companyId}`);
}

/** Delete from the contact detail page, then land back on the list. */
export async function deleteContactGlobal(contactId: string) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const { data } = await auth.supabase
    .from("contacts")
    .delete()
    .eq("id", contactId)
    .eq("workspace_id", auth.workspaceId)
    .select("company_id")
    .single();

  revalidatePath("/contacts");
  if (data) revalidatePath(`/companies/${data.company_id}`);
  redirect("/contacts");
}

export async function updateContact(contactId: string, formData: FormData) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const { data, error } = await auth.supabase
    .from("contacts")
    .update({
      name: str(formData, "name") ?? undefined,
      title: str(formData, "title"),
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      linkedin_url: str(formData, "linkedin_url"),
      notes: str(formData, "notes"),
    })
    .eq("id", contactId)
    .eq("workspace_id", auth.workspaceId)
    .select("company_id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/contacts");
  if (data) revalidatePath(`/companies/${data.company_id}`);
}

export async function deleteContact(companyId: string, contactId: string) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const { error } = await auth.supabase
    .from("contacts")
    .delete()
    .eq("id", contactId)
    .eq("workspace_id", auth.workspaceId);

  if (error) throw new Error(error.message);
  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/contacts");
}

// ---------- deals ----------

export async function createDeal(companyId: string, formData: FormData) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const title = str(formData, "title");
  if (!title) return;
  const value = str(formData, "value");
  const settings = await getWorkspaceSettings(auth.supabase, auth.workspaceId);

  const { error } = await auth.supabase.from("deals").insert({
    workspace_id: auth.workspaceId,
    company_id: companyId,
    title,
    stage: (str(formData, "stage") as DealStage) ?? "new",
    value: value ? Number(value) : null,
    currency: settings.currency,
    expected_close: str(formData, "expected_close"),
    position: Date.now(), // append to the end of its column
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/pipeline");
}

/** Kanban drag: move a company to a pipeline stage. Logs the stage change
 * to the activity timeline when the stage actually changes. */
export async function moveCompanyStage(
  companyId: string,
  stage: DealStage,
  position: number
) {
  const auth = await getAuthContext();
  if (!auth) return { error: "Not authenticated" };

  const { data: current } = await auth.supabase
    .from("companies")
    .select("stage")
    .eq("id", companyId)
    .eq("workspace_id", auth.workspaceId)
    .single();

  const { error } = await auth.supabase
    .from("companies")
    .update({ stage, stage_position: position })
    .eq("id", companyId)
    .eq("workspace_id", auth.workspaceId);

  if (error) return { error: error.message };

  if (current && current.stage !== stage) {
    await auth.supabase.from("activities").insert({
      workspace_id: auth.workspaceId,
      company_id: companyId,
      type: "note",
      subject: `Moved to ${STAGE_LABELS[stage]}`,
    });
  }

  revalidatePath("/pipeline");
  revalidatePath("/companies");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function deleteDeal(dealId: string, companyId: string) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const { error } = await auth.supabase
    .from("deals")
    .delete()
    .eq("id", dealId)
    .eq("workspace_id", auth.workspaceId);

  if (error) throw new Error(error.message);
  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/pipeline");
}

// ---------- activities ----------

export async function logActivity(companyId: string, formData: FormData) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const subject = str(formData, "subject");
  if (!subject) return;
  const type = (str(formData, "type") as ActivityType) ?? "note";
  const dueAt = str(formData, "due_at");

  const { error } = await auth.supabase.from("activities").insert({
    workspace_id: auth.workspaceId,
    company_id: companyId,
    contact_id: str(formData, "contact_id"),
    type,
    subject,
    body: str(formData, "body"),
    due_at: dueAt ? new Date(dueAt).toISOString() : null,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/dashboard");
}

export async function completeTask(activityId: string, companyId: string) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const { error } = await auth.supabase
    .from("activities")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", activityId)
    .eq("workspace_id", auth.workspaceId);

  if (error) throw new Error(error.message);
  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/dashboard");
}

export async function deleteActivity(activityId: string, companyId: string) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const { error } = await auth.supabase
    .from("activities")
    .delete()
    .eq("id", activityId)
    .eq("workspace_id", auth.workspaceId);

  if (error) throw new Error(error.message);
  revalidatePath(`/companies/${companyId}`);
}

// ---------- knowledge base ----------

export async function deleteDocument(documentId: string, companyId: string) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  // Cascades to document_chunks via FK.
  const { error } = await auth.supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("workspace_id", auth.workspaceId);

  if (error) throw new Error(error.message);
  revalidatePath(`/companies/${companyId}`);
}

// ---------- email ----------

export type EmailDraftInput = {
  id?: string | null;
  contactId: string | null;
  subject: string;
  body: string;
  goal: string;
  tone: string;
  language: string;
  instructions: string | null;
};

/** Insert or update a draft in the email workspace. Returns the draft id. */
export async function saveEmailDraft(companyId: string, draft: EmailDraftInput) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const values = {
    contact_id: draft.contactId,
    subject: draft.subject.slice(0, 300),
    body: draft.body,
    goal: draft.goal,
    tone: draft.tone,
    language: draft.language,
    instructions: draft.instructions,
  };

  if (draft.id) {
    const { error } = await auth.supabase
      .from("email_drafts")
      .update(values)
      .eq("id", draft.id)
      .eq("workspace_id", auth.workspaceId);
    if (error) throw new Error(error.message);
    revalidatePath(`/companies/${companyId}`);
    return { id: draft.id };
  }

  const { data, error } = await auth.supabase
    .from("email_drafts")
    .insert({ ...values, workspace_id: auth.workspaceId, company_id: companyId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(`/companies/${companyId}`);
  return { id: data.id };
}

export async function deleteEmailDraft(draftId: string, companyId: string) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const { error } = await auth.supabase
    .from("email_drafts")
    .delete()
    .eq("id", draftId)
    .eq("workspace_id", auth.workspaceId);

  if (error) throw new Error(error.message);
  revalidatePath(`/companies/${companyId}`);
}

export async function logEmailSent(
  companyId: string,
  contactId: string | null,
  subject: string,
  body: string,
  followUpDays: number,
  draftId?: string | null
) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const { error } = await auth.supabase.from("activities").insert({
    workspace_id: auth.workspaceId,
    company_id: companyId,
    contact_id: contactId,
    type: "ai_email",
    subject: `Email sent: ${subject}`,
    body,
  });
  if (error) throw new Error(error.message);

  if (draftId) {
    await auth.supabase
      .from("email_drafts")
      .update({ status: "sent" })
      .eq("id", draftId)
      .eq("workspace_id", auth.workspaceId);
  }

  if (followUpDays > 0) {
    await auth.supabase.from("activities").insert({
      workspace_id: auth.workspaceId,
      company_id: companyId,
      contact_id: contactId,
      type: "task",
      subject: `Follow up on: ${subject}`,
      due_at: new Date(Date.now() + followUpDays * 86400_000).toISOString(),
    });
  }

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/dashboard");
}

// ---------- proposals ----------

export type ProposalInput = {
  id?: string | null;
  title: string;
  status: ProposalStatus;
  content: ProposalSection[];
};

/** Insert or update a proposal. Returns the proposal id. */
export async function saveProposal(companyId: string, proposal: ProposalInput) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const values = {
    title: proposal.title.slice(0, 300) || "Proposal",
    status: proposal.status,
    content: proposal.content,
  };

  if (proposal.id) {
    const { error } = await auth.supabase
      .from("proposals")
      .update(values)
      .eq("id", proposal.id)
      .eq("workspace_id", auth.workspaceId);
    if (error) throw new Error(error.message);
    revalidatePath(`/companies/${companyId}`);
    return { id: proposal.id };
  }

  const { data, error } = await auth.supabase
    .from("proposals")
    .insert({ ...values, workspace_id: auth.workspaceId, company_id: companyId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await auth.supabase.from("activities").insert({
    workspace_id: auth.workspaceId,
    company_id: companyId,
    type: "note",
    subject: `Proposal created: ${values.title}`,
  });

  revalidatePath(`/companies/${companyId}`);
  return { id: data.id };
}

export async function deleteProposal(proposalId: string, companyId: string) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const { error } = await auth.supabase
    .from("proposals")
    .delete()
    .eq("id", proposalId)
    .eq("workspace_id", auth.workspaceId);

  if (error) throw new Error(error.message);
  revalidatePath(`/companies/${companyId}`);
}

// ---------- demo data ----------

const daysAgo = (d: number) => new Date(Date.now() - d * 86400_000).toISOString();
const daysAhead = (d: number) => new Date(Date.now() + d * 86400_000).toISOString();

type DemoCompany = {
  name: string;
  domain: string;
  industry: string;
  size: string;
  country: string;
  stage: DealStage;
  createdDaysAgo: number;
  contacts: { name: string; title: string; email: string }[];
  deals: {
    title: string;
    stage: DealStage;
    value: number;
    createdDaysAgo: number;
    closedDaysAgo?: number;
  }[];
  activities: {
    type: ActivityType;
    subject: string;
    body?: string;
    daysAgo: number;
    dueInDays?: number;
  }[];
};

const DEMO_COMPANIES: DemoCompany[] = [
  {
    name: "Alpine Robotics d.o.o.",
    domain: "alpinerobotics.example",
    industry: "Manufacturing automation",
    size: "50-200",
    country: "Slovenia",
    stage: "proposal_sent",
    createdDaysAgo: 70,
    contacts: [
      { name: "Ana Kovač", title: "CTO", email: "ana@alpinerobotics.example" },
      { name: "Marko Zupan", title: "Head of Production", email: "marko@alpinerobotics.example" },
    ],
    deals: [
      { title: "Vision QA automation", stage: "proposal_sent", value: 28000, createdDaysAgo: 20 },
      { title: "Pilot: invoice processing", stage: "won", value: 12000, createdDaysAgo: 90, closedDaysAgo: 75 },
    ],
    activities: [
      { type: "meeting", subject: "Discovery call with Ana", body: "Walked through QA bottlenecks on line 2.", daysAgo: 25 },
      { type: "email", subject: "Sent proposal — vision QA automation", daysAgo: 18 },
      { type: "task", subject: "Follow up on proposal", daysAgo: 18, dueInDays: 2 },
    ],
  },
  {
    name: "Nordwind Logistics GmbH",
    domain: "nordwind.example",
    industry: "Logistics",
    size: "200-1000",
    country: "Austria",
    stage: "negotiating",
    createdDaysAgo: 110,
    contacts: [
      { name: "Stefan Berger", title: "Head of Operations", email: "stefan@nordwind.example" },
      { name: "Julia Maier", title: "IT Lead", email: "julia@nordwind.example" },
    ],
    deals: [
      { title: "Dispatch copilot rollout", stage: "negotiating", value: 45000, createdDaysAgo: 30 },
      { title: "Discovery workshop", stage: "won", value: 5000, createdDaysAgo: 108, closedDaysAgo: 100 },
    ],
    activities: [
      { type: "meeting", subject: "Workshop: dispatch process mapping", daysAgo: 35 },
      { type: "email", subject: "Sent pricing tiers", daysAgo: 12 },
      { type: "call", subject: "Negotiation call — pricing tiers", body: "Stefan wants phased rollout across 3 hubs.", daysAgo: 8 },
      { type: "task", subject: "Send revised contract", daysAgo: 5, dueInDays: -1 },
    ],
  },
  {
    name: "Verde Marketing Studio",
    domain: "verdestudio.example",
    industry: "Marketing agency",
    size: "10-50",
    country: "Slovenia",
    stage: "contacted",
    createdDaysAgo: 25,
    contacts: [{ name: "Maja Novak", title: "Founder", email: "maja@verdestudio.example" }],
    deals: [
      { title: "Content ops automation", stage: "new", value: 6500, createdDaysAgo: 10 },
    ],
    activities: [
      { type: "email", subject: "First-touch email sent", daysAgo: 9 },
      { type: "task", subject: "Follow up with Maja", daysAgo: 9, dueInDays: 1 },
    ],
  },
  {
    name: "Baltika Foods d.o.o.",
    domain: "baltikafoods.example",
    industry: "Food & beverage",
    size: "200-1000",
    country: "Slovenia",
    stage: "won",
    createdDaysAgo: 130,
    contacts: [
      { name: "Petra Horvat", title: "COO", email: "petra@baltikafoods.example" },
      { name: "Luka Kranjc", title: "Customer Service Lead", email: "luka@baltikafoods.example" },
    ],
    deals: [
      { title: "Customer-service chatbot", stage: "won", value: 18000, createdDaysAgo: 80, closedDaysAgo: 30 },
      { title: "Phase 2: order tracking bot", stage: "proposal_sent", value: 22000, createdDaysAgo: 10 },
    ],
    activities: [
      { type: "meeting", subject: "Phase 2 scoping workshop", daysAgo: 10 },
      { type: "email", subject: "Sent phase 2 proposal", daysAgo: 7 },
      { type: "note", subject: "Chatbot live — 40% ticket deflection", daysAgo: 25 },
    ],
  },
  {
    name: "Adria Marine Charter",
    domain: "adriamarine.example",
    industry: "Travel & leisure",
    size: "10-50",
    country: "Croatia",
    stage: "lost",
    createdDaysAgo: 85,
    contacts: [{ name: "Ivan Barić", title: "Owner", email: "ivan@adriamarine.example" }],
    deals: [
      { title: "Booking automation", stage: "lost", value: 9000, createdDaysAgo: 80, closedDaysAgo: 50 },
    ],
    activities: [
      { type: "email", subject: "Intro email — booking automation", daysAgo: 70 },
      { type: "note", subject: "Marked lost — budget frozen until next season", daysAgo: 50 },
    ],
  },
];

export async function loadDemoData() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  const ws = auth.workspaceId;

  // Idempotent: don't stack a second copy on repeated clicks.
  const { count } = await auth.supabase
    .from("companies")
    .select("*", { count: "exact", head: true })
    .eq("is_demo", true);
  if ((count ?? 0) > 0) {
    revalidatePath("/companies");
    return;
  }

  for (const [i, demo] of DEMO_COMPANIES.entries()) {
    const { data: company, error } = await auth.supabase
      .from("companies")
      .insert({
        workspace_id: ws,
        name: demo.name,
        domain: demo.domain,
        industry: demo.industry,
        size: demo.size,
        country: demo.country,
        stage: demo.stage,
        stage_position: Date.now() + i,
        is_demo: true,
        created_at: daysAgo(demo.createdDaysAgo),
      })
      .select("id")
      .single();
    if (error || !company) throw new Error(error?.message ?? "Demo insert failed");

    const { data: contacts } = await auth.supabase
      .from("contacts")
      .insert(
        demo.contacts.map((c) => ({
          workspace_id: ws,
          company_id: company.id,
          ...c,
        }))
      )
      .select("id");

    await auth.supabase.from("deals").insert(
      demo.deals.map((d, j) => ({
        workspace_id: ws,
        company_id: company.id,
        title: d.title,
        stage: d.stage,
        value: d.value,
        position: Date.now() + j,
        created_at: daysAgo(d.createdDaysAgo),
        updated_at: daysAgo(d.closedDaysAgo ?? d.createdDaysAgo),
      }))
    );

    await auth.supabase.from("activities").insert(
      demo.activities.map((a) => ({
        workspace_id: ws,
        company_id: company.id,
        contact_id: contacts?.[0]?.id ?? null,
        type: a.type,
        subject: a.subject,
        body: a.body ?? null,
        created_at: daysAgo(a.daysAgo),
        due_at: a.dueInDays != null ? daysAhead(a.dueInDays) : null,
      }))
    );
  }

  await auth.supabase.from("leads").insert([
    {
      workspace_id: ws,
      name: "Karst Precision Tools",
      domain: "karsttools.example",
      industry: "Industrial tooling",
      country: "Slovenia",
      size: "50-200",
      description: "CNC tooling manufacturer supplying automotive suppliers across the EU.",
      fit_reason: "Quoting is done manually from email threads — a quoting copilot could cut response time from days to hours.",
      search_query: "Demo: manufacturing companies in the Alps-Adriatic region",
      is_demo: true,
    },
    {
      workspace_id: ws,
      name: "Donau Fresh Logistik",
      domain: "donaufresh.example",
      industry: "Cold-chain logistics",
      country: "Austria",
      size: "200-1000",
      description: "Temperature-controlled distribution for grocery chains in Austria and Hungary.",
      fit_reason: "Dispatchers coordinate by phone and spreadsheets — routing and ETA automation is a natural first project.",
      search_query: "Demo: logistics companies in the Alps-Adriatic region",
      is_demo: true,
    },
  ]);

  revalidatePath("/companies");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  revalidatePath("/contacts");
  revalidatePath("/leads");
}

/** One click removes everything loadDemoData created (cascades take children). */
export async function removeDemoData() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const { error } = await auth.supabase
    .from("companies")
    .delete()
    .eq("workspace_id", auth.workspaceId)
    .eq("is_demo", true);
  if (error) throw new Error(error.message);

  await auth.supabase
    .from("leads")
    .delete()
    .eq("workspace_id", auth.workspaceId)
    .eq("is_demo", true);

  revalidatePath("/companies");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  revalidatePath("/contacts");
  revalidatePath("/leads");
  revalidatePath("/settings");
}
