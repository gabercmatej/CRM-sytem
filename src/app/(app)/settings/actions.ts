"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/server";

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
