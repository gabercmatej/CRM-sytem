import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/server";
import { signout } from "@/app/(auth)/actions";
import { AppSidebar } from "@/components/app-sidebar";
import { SearchCommand } from "@/components/search-command";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const [{ data: workspace }, { data: userData }] = await Promise.all([
    auth.supabase
      .from("workspaces")
      .select("name")
      .eq("id", auth.workspaceId)
      .single(),
    auth.supabase.auth.getUser(),
  ]);

  return (
    <div className="min-h-screen w-full">
      <AppSidebar
        workspaceName={workspace?.name ?? "CRM"}
        userEmail={userData.user?.email ?? ""}
        signout={signout}
      />
      <SearchCommand />
      <main className="min-w-0 lg:pl-60">
        <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
