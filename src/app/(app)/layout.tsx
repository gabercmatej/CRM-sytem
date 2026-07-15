import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
} from "lucide-react";
import { getAuthContext } from "@/lib/supabase/server";
import { signout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const { data: workspace } = await auth.supabase
    .from("workspaces")
    .select("name")
    .eq("id", auth.workspaceId)
    .single();

  return (
    <div className="flex min-h-screen w-full">
      <aside className="fixed inset-y-0 left-0 z-10 flex w-56 flex-col border-r bg-background">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Sparkles className="size-5 text-primary" />
          <span className="truncate font-semibold">
            {workspace?.name ?? "CRM"}
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-3">
          <form action={signout}>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 text-muted-foreground"
              type="submit"
            >
              <LogOut className="size-4" />
              Log out
            </Button>
          </form>
        </div>
      </aside>
      <main className="ml-56 flex-1 bg-muted/20 p-6">{children}</main>
    </div>
  );
}
