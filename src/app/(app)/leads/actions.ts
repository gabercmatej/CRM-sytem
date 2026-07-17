"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/server";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

export async function dismissLead(leadId: string) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const { error } = await auth.supabase
    .from("leads")
    .update({ status: "dismissed" })
    .eq("id", leadId)
    .eq("workspace_id", auth.workspaceId);

  if (error) throw new Error(error.message);
  revalidatePath("/leads");
}

/** "Add Company" from a discovered lead: creates the company (form is the
 * same dialog as manual creation, pre-filled), links the lead, and jumps
 * straight to the new company page. */
export async function createCompanyFromLead(leadId: string, formData: FormData) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const name = str(formData, "name");
  if (!name) return;

  const { data: company, error } = await auth.supabase
    .from("companies")
    .insert({
      workspace_id: auth.workspaceId,
      name,
      domain:
        str(formData, "domain")?.replace(/^https?:\/\//, "").replace(/\/.*$/, "") ??
        null,
      industry: str(formData, "industry"),
      size: str(formData, "size"),
      country: str(formData, "country"),
      linkedin_url: str(formData, "linkedin_url"),
      notes: str(formData, "notes"),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await auth.supabase
    .from("leads")
    .update({ status: "added", company_id: company.id })
    .eq("id", leadId)
    .eq("workspace_id", auth.workspaceId);

  await auth.supabase.from("activities").insert({
    workspace_id: auth.workspaceId,
    company_id: company.id,
    type: "note",
    subject: "Added from lead discovery",
  });

  revalidatePath("/leads");
  revalidatePath("/companies");
  revalidatePath("/pipeline");
  redirect(`/companies/${company.id}`);
}
