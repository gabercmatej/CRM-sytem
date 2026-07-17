import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { LeadsBoard } from "./leads-board";

export const metadata = { title: "Find Leads" };

export default async function LeadsPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const [{ data: suggested }, { data: added }] = await Promise.all([
    auth.supabase
      .from("leads")
      .select("*")
      .eq("status", "suggested")
      .order("created_at", { ascending: false })
      .limit(50),
    auth.supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "added"),
  ]);
  void added;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Find Leads"
        description="Describe your ideal customer — the agent searches the web for real, verified companies and drops them here for review."
      />
      <LeadsBoard initialLeads={suggested ?? []} />
    </div>
  );
}
