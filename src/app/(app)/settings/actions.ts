"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/server";
import { DEFAULT_WORKSPACE_SETTINGS } from "@/lib/workspace-settings";

export async function updateWorkspaceName(formData: FormData) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const { error } = await auth.supabase
    .from("workspaces")
    .update({ name })
    .eq("id", auth.workspaceId);

  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

/** Display name lives in Supabase auth user metadata — no extra table needed. */
export async function updateProfile(formData: FormData) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const displayName = String(formData.get("display_name") ?? "").trim();

  const { error } = await auth.supabase.auth.updateUser({
    data: { display_name: displayName || null },
  });

  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

/** Workspace preferences: currency, default email language, follow-up delay. */
export async function updateWorkspacePreferences(formData: FormData) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const currency = String(formData.get("currency") ?? "").trim().toUpperCase();
  const emailLanguage = String(formData.get("email_language") ?? "").trim();
  const followUpRaw = Number(formData.get("follow_up_days"));

  const settings = {
    currency: ["EUR", "USD", "GBP", "CHF"].includes(currency)
      ? currency
      : DEFAULT_WORKSPACE_SETTINGS.currency,
    email_language: ["en", "sl"].includes(emailLanguage)
      ? emailLanguage
      : DEFAULT_WORKSPACE_SETTINGS.email_language,
    follow_up_days:
      Number.isFinite(followUpRaw) && followUpRaw >= 0 && followUpRaw <= 60
        ? Math.round(followUpRaw)
        : DEFAULT_WORKSPACE_SETTINGS.follow_up_days,
  };

  const { error } = await auth.supabase
    .from("workspaces")
    .update({ settings })
    .eq("id", auth.workspaceId);

  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
