"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/server";
import type { ActivityType, DealStage } from "@/lib/database.types";

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
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/companies");
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
      status: str(formData, "status") ?? undefined,
      notes: str(formData, "notes"),
    })
    .eq("id", companyId)
    .eq("workspace_id", auth.workspaceId);

  if (error) throw new Error(error.message);
  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/companies");
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
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/companies/${companyId}`);
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
}

// ---------- deals ----------

export async function createDeal(companyId: string, formData: FormData) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const title = str(formData, "title");
  if (!title) return;
  const value = str(formData, "value");

  const { error } = await auth.supabase.from("deals").insert({
    workspace_id: auth.workspaceId,
    company_id: companyId,
    title,
    stage: (str(formData, "stage") as DealStage) ?? "new",
    value: value ? Number(value) : null,
    expected_close: str(formData, "expected_close"),
    position: Date.now(), // append to the end of its column
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/pipeline");
}

export async function moveDeal(dealId: string, stage: DealStage, position: number) {
  const auth = await getAuthContext();
  if (!auth) return { error: "Not authenticated" };

  const { error } = await auth.supabase
    .from("deals")
    .update({ stage, position })
    .eq("id", dealId)
    .eq("workspace_id", auth.workspaceId);

  if (error) return { error: error.message };
  revalidatePath("/pipeline");
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

export async function logEmailSent(
  companyId: string,
  contactId: string | null,
  subject: string,
  body: string,
  followUpDays: number
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

// ---------- demo data ----------

export async function loadDemoData() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  const ws = auth.workspaceId;

  const demo = [
    {
      name: "Alpine Robotics d.o.o.",
      domain: "alpinerobotics.example",
      industry: "Manufacturing automation",
      size: "50-200",
      country: "Slovenia",
    },
    {
      name: "Nordwind Logistics GmbH",
      domain: "nordwind.example",
      industry: "Logistics",
      size: "200-1000",
      country: "Austria",
    },
    {
      name: "Verde Marketing Studio",
      domain: "verdestudio.example",
      industry: "Marketing agency",
      size: "10-50",
      country: "Slovenia",
    },
  ];

  const { data: companies, error } = await auth.supabase
    .from("companies")
    .insert(demo.map((c) => ({ ...c, workspace_id: ws })))
    .select("id, name");

  if (error) throw new Error(error.message);

  for (const [i, company] of (companies ?? []).entries()) {
    await auth.supabase.from("contacts").insert({
      workspace_id: ws,
      company_id: company.id,
      name: ["Ana Kovač", "Stefan Berger", "Maja Novak"][i],
      title: ["CTO", "Head of Operations", "Founder"][i],
      email: ["ana@alpinerobotics.example", "stefan@nordwind.example", "maja@verdestudio.example"][i],
    });
    await auth.supabase.from("deals").insert({
      workspace_id: ws,
      company_id: company.id,
      title: `AI automation project — ${company.name.split(" ")[0]}`,
      stage: (["new", "contacted", "meeting_booked"] as DealStage[])[i],
      value: [12000, 28000, 6500][i],
      position: Date.now() + i,
    });
    await auth.supabase.from("activities").insert({
      workspace_id: ws,
      company_id: company.id,
      type: "note" as ActivityType,
      subject: "Added from demo data",
      body: "Use this company to try the research agent, knowledge base and email generator.",
    });
  }

  revalidatePath("/companies");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
}
