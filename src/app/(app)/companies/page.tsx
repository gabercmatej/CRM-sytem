import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { getAuthContext } from "@/lib/supabase/server";
import { getWorkspaceSettings } from "@/lib/workspace-settings";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { loadDemoData } from "./actions";
import { NewCompanyDialog } from "./new-company-dialog";
import { CompaniesTable, type CompanyRow } from "./companies-table";

export const metadata = { title: "Companies" };

export default async function CompaniesPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const [companiesRes, dealsRes, contactsRes, activitiesRes, settings] = await Promise.all([
    auth.supabase
      .from("companies")
      .select("id, name, domain, industry, country, stage, created_at")
      .order("created_at", { ascending: false }),
    auth.supabase.from("deals").select("company_id, value, stage"),
    auth.supabase
      .from("contacts")
      .select("company_id, name, created_at")
      .order("created_at", { ascending: true }),
    auth.supabase
      .from("activities")
      .select("company_id, created_at")
      .order("created_at", { ascending: false })
      .limit(2000),
    getWorkspaceSettings(auth.supabase, auth.workspaceId),
  ]);

  const revenue = new Map<string, number>();
  for (const d of dealsRes.data ?? []) {
    if (d.stage === "lost") continue;
    revenue.set(d.company_id, (revenue.get(d.company_id) ?? 0) + (d.value ?? 0));
  }

  const primaryContact = new Map<string, string>();
  for (const c of contactsRes.data ?? []) {
    if (!primaryContact.has(c.company_id)) primaryContact.set(c.company_id, c.name);
  }

  const lastActivity = new Map<string, string>();
  for (const a of activitiesRes.data ?? []) {
    if (!lastActivity.has(a.company_id)) lastActivity.set(a.company_id, a.created_at);
  }

  const rows: CompanyRow[] = (companiesRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    domain: c.domain,
    industry: c.industry,
    country: c.country,
    stage: c.stage,
    created_at: c.created_at,
    revenue: revenue.get(c.id) ?? 0,
    contactName: primaryContact.get(c.id) ?? null,
    lastActivityAt: lastActivity.get(c.id) ?? null,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Companies"
        description="Every company in your workspace — each one lives on the pipeline from day one."
        actions={rows.length > 0 ? <NewCompanyDialog /> : undefined}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No companies yet"
          description="Add your first company to start researching, reaching out and tracking deals — or load demo data to explore."
          action={
            <>
              <NewCompanyDialog />
              <form action={loadDemoData}>
                <Button variant="outline" type="submit">
                  Load demo data
                </Button>
              </form>
            </>
          }
        />
      ) : (
        <CompaniesTable rows={rows} currency={settings.currency} />
      )}
    </div>
  );
}
