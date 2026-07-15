import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/server";
import { KanbanBoard } from "./kanban-board";

export const metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const { data: deals } = await auth.supabase
    .from("deals")
    .select("id, title, stage, value, currency, position, company_id, companies(name)")
    .order("position");

  const board = (deals ?? []).map((d) => ({
    id: d.id,
    title: d.title,
    stage: d.stage,
    value: d.value,
    currency: d.currency,
    position: d.position,
    companyId: d.company_id,
    companyName:
      (d.companies as unknown as { name: string } | null)?.name ?? "Unknown",
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Pipeline</h1>
      <KanbanBoard initialDeals={board} />
    </div>
  );
}
