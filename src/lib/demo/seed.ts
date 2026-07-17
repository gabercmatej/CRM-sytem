import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { DEMO_COMPANIES, DEMO_LEADS } from "./data";

const daysAgo = (d: number) => new Date(Date.now() - d * 86400_000).toISOString();
const daysAhead = (d: number) => new Date(Date.now() + d * 86400_000).toISOString();

type Client = SupabaseClient<Database>;

/**
 * Replace a workspace's demo data with the canonical dataset. Idempotent —
 * deletes existing `is_demo` rows first (children cascade), then re-inserts.
 * Works with either the RLS client (own workspace) or the admin client.
 */
export async function seedDemoWorkspace(supabase: Client, workspaceId: string) {
  await supabase.from("companies").delete().eq("workspace_id", workspaceId).eq("is_demo", true);
  await supabase.from("leads").delete().eq("workspace_id", workspaceId).eq("is_demo", true);

  for (const [i, demo] of DEMO_COMPANIES.entries()) {
    const { data: company, error } = await supabase
      .from("companies")
      .insert({
        workspace_id: workspaceId,
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

    const { data: contacts } = await supabase
      .from("contacts")
      .insert(demo.contacts.map((c) => ({ workspace_id: workspaceId, company_id: company.id, ...c })))
      .select("id");

    await supabase.from("deals").insert(
      demo.deals.map((d, j) => ({
        workspace_id: workspaceId,
        company_id: company.id,
        title: d.title,
        stage: d.stage,
        value: d.value,
        position: Date.now() + j,
        created_at: daysAgo(d.createdDaysAgo),
        updated_at: daysAgo(d.closedDaysAgo ?? d.createdDaysAgo),
      }))
    );

    await supabase.from("activities").insert(
      demo.activities.map((a) => ({
        workspace_id: workspaceId,
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

  await supabase.from("leads").insert(
    DEMO_LEADS.map((l) => ({ workspace_id: workspaceId, is_demo: true, ...l }))
  );
}

/**
 * Restore the demo dataset only when the workspace has no companies — the
 * self-healing guard for the shared public demo. Non-destructive: it never
 * touches a workspace that still has data, so it won't disrupt a visitor
 * mid-exploration. Failures are swallowed so a page render never breaks.
 */
export async function ensureDemoSeeded(supabase: Client, workspaceId: string) {
  try {
    const { count } = await supabase
      .from("companies")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);
    if ((count ?? 0) === 0) {
      await seedDemoWorkspace(supabase, workspaceId);
    }
  } catch {
    // Never let demo seeding break the app shell.
  }
}
