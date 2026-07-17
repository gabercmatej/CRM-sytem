import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WorkspaceSettings } from "@/lib/database.types";

export type ResolvedWorkspaceSettings = Required<WorkspaceSettings>;

export const DEFAULT_WORKSPACE_SETTINGS: ResolvedWorkspaceSettings = {
  currency: "EUR",
  email_language: "en",
  follow_up_days: 3,
};

export function resolveWorkspaceSettings(
  settings: WorkspaceSettings | null | undefined
): ResolvedWorkspaceSettings {
  return { ...DEFAULT_WORKSPACE_SETTINGS, ...(settings ?? {}) };
}

/** Fetch + normalize workspace preferences (single-row query, RLS-scoped). */
export async function getWorkspaceSettings(
  supabase: SupabaseClient<Database>,
  workspaceId: string
): Promise<ResolvedWorkspaceSettings> {
  const { data } = await supabase
    .from("workspaces")
    .select("settings")
    .eq("id", workspaceId)
    .single();
  return resolveWorkspaceSettings(data?.settings);
}
