import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/server";
import { getWorkspaceSettings } from "@/lib/workspace-settings";
import { OPEN_STAGES, formatMoney } from "@/lib/constants";
import { PageHeader } from "@/components/page-header";
import { KanbanBoard, type BoardCompany } from "./kanban-board";

export const metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const [companiesRes, dealsRes, activitiesRes, settings] = await Promise.all([
    auth.supabase
      .from("companies")
      .select("id, name, domain, industry, stage, stage_position, last_researched_at")
      .order("stage_position"),
    auth.supabase.from("deals").select("company_id, value, stage"),
    auth.supabase
      .from("activities")
      .select("company_id, created_at")
      .order("created_at", { ascending: false })
      .limit(2000),
    getWorkspaceSettings(auth.supabase, auth.workspaceId),
  ]);

  const dealValue = new Map<string, { sum: number; count: number }>();
  for (const d of dealsRes.data ?? []) {
    if (d.stage === "lost") continue;
    const entry = dealValue.get(d.company_id) ?? { sum: 0, count: 0 };
    entry.sum += d.value ?? 0;
    entry.count += 1;
    dealValue.set(d.company_id, entry);
  }

  const lastActivity = new Map<string, string>();
  for (const a of activitiesRes.data ?? []) {
    if (!lastActivity.has(a.company_id)) lastActivity.set(a.company_id, a.created_at);
  }

  const companies: BoardCompany[] = (companiesRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    domain: c.domain,
    industry: c.industry,
    stage: c.stage,
    position: c.stage_position,
    dealValue: dealValue.get(c.id)?.sum ?? 0,
    dealCount: dealValue.get(c.id)?.count ?? 0,
    researched: !!c.last_researched_at,
    lastActivityAt: lastActivity.get(c.id) ?? null,
  }));

  const openValue = companies
    .filter((c) => OPEN_STAGES.includes(c.stage))
    .reduce((sum, c) => sum + c.dealValue, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline"
        description={
          openValue > 0
            ? `${formatMoney(openValue, settings.currency)} in open pipeline across ${companies.length} companies.`
            : "Drag companies between stages as your conversations progress."
        }
      />
      <KanbanBoard companies={companies} currency={settings.currency} />
    </div>
  );
}
