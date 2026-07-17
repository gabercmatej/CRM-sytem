"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChartNoAxesColumn,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Telescope,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV_GROUPS: { label: string | null; items: NavItem[] }[] = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/analytics", label: "Analytics", icon: ChartNoAxesColumn },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/companies", label: "Companies", icon: Building2 },
      { href: "/contacts", label: "Contacts", icon: Users },
      { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
    ],
  },
  {
    label: "Growth",
    items: [{ href: "/leads", label: "Find Leads", icon: Telescope }],
  },
];

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
      )}
    >
      <item.icon
        className={cn(
          "size-4 shrink-0 transition-colors",
          active
            ? "text-primary"
            : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
        )}
        aria-hidden
      />
      {item.label}
    </Link>
  );
}

function SidebarBody({
  workspaceName,
  userEmail,
  signout,
  onNavigate,
}: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2.5 px-4">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-[13px] font-semibold text-primary-foreground">
          C
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm leading-tight font-semibold text-sidebar-accent-foreground">
            CRM system
          </p>
          <p className="truncate text-xs leading-tight text-muted-foreground">
            {workspaceName}
          </p>
        </div>
      </div>

      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            window.dispatchEvent(new Event("open-search"));
          }}
          className="flex w-full items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-sm text-muted-foreground shadow-xs transition-colors hover:text-foreground"
        >
          <Search className="size-3.5" aria-hidden />
          Search
          <kbd className="ml-auto rounded border bg-muted px-1.5 py-px font-mono text-[10px] font-medium">
            ⌘K
          </kbd>
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label ?? "root"} className="flex flex-col gap-0.5">
            {group.label ? (
              <p className="px-2.5 pb-1 text-[11px] font-medium tracking-wide text-sidebar-foreground/50">
                {group.label}
              </p>
            ) : null}
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(item.href)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <NavLink
          item={{ href: "/settings", label: "Settings", icon: Settings }}
          active={isActive("/settings")}
          onNavigate={onNavigate}
        />
        <div className="mt-2 flex items-center justify-between gap-2 px-1">
          <p className="truncate text-xs text-muted-foreground" title={userEmail}>
            {userEmail}
          </p>
          <div className="flex shrink-0 items-center">
            <ThemeToggle />
            <form action={signout}>
              <Button
                variant="ghost"
                size="icon-sm"
                type="submit"
                aria-label="Log out"
              >
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

type SidebarProps = {
  workspaceName: string;
  userEmail: string;
  signout: () => Promise<void>;
};

export function AppSidebar(props: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes (state-adjustment-during-render
  // pattern — no effect needed).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    if (mobileOpen) {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarBody {...props} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80 lg:hidden">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="flex size-5 items-center justify-center rounded bg-primary text-[11px] font-semibold text-primary-foreground">
            C
          </div>
          <span className="text-sm font-semibold">CRM system</span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto"
          onClick={() => window.dispatchEvent(new Event("open-search"))}
          aria-label="Search"
        >
          <Search className="size-4" />
        </Button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/25 backdrop-blur-xs motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150"
          />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-sidebar-border bg-sidebar shadow-xl motion-safe:animate-in motion-safe:slide-in-from-left motion-safe:duration-200">
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-3.5 right-3 z-10"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            >
              <X className="size-4" />
            </Button>
            <SidebarBody {...props} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
