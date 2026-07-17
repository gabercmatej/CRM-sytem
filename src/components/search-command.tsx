"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChartNoAxesColumn,
  KanbanSquare,
  LayoutDashboard,
  Search,
  Settings,
  Telescope,
  UserRound,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { StageDot } from "@/components/stage-badge";
import { getSearchIndex, type SearchIndex } from "@/app/(app)/actions";
import { cn } from "@/lib/utils";

type Item = {
  key: string;
  group: "Pages" | "Companies" | "Contacts";
  label: string;
  sub?: string | null;
  href: string;
  icon?: LucideIcon;
  stage?: SearchIndex["companies"][number]["stage"];
};

const PAGES: Item[] = [
  { key: "p-dashboard", group: "Pages", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "p-analytics", group: "Pages", label: "Analytics", href: "/analytics", icon: ChartNoAxesColumn },
  { key: "p-companies", group: "Pages", label: "Companies", href: "/companies", icon: Building2 },
  { key: "p-contacts", group: "Pages", label: "Contacts", href: "/contacts", icon: Users },
  { key: "p-pipeline", group: "Pages", label: "Pipeline", href: "/pipeline", icon: KanbanSquare },
  { key: "p-leads", group: "Pages", label: "Find Leads", href: "/leads", icon: Telescope },
  { key: "p-settings", group: "Pages", label: "Settings", href: "/settings", icon: Settings },
];

/** Global ⌘K palette: pages, companies, contacts. Opens via hotkey or the
 * sidebar search button (custom "open-search" window event). */
export function SearchCommand() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !index) {
      getSearchIndex()
        .then(setIndex)
        .catch(() => setIndex({ companies: [], contacts: [] }));
    }
  }, [open, index]);

  const setOpenAndReset = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery("");
      setActive(0);
    }
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpenAndReset(!open);
      }
    }
    function onOpen() {
      setOpenAndReset(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-search", onOpen);
    };
  }, [open, setOpenAndReset]);

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const match = (s: string | null | undefined) =>
      !q || (s ?? "").toLowerCase().includes(q);

    const pages = PAGES.filter((p) => match(p.label));
    const companies: Item[] = (index?.companies ?? [])
      .filter((c) => match(c.name) || match(c.domain))
      .slice(0, q ? 8 : 5)
      .map((c) => ({
        key: `c-${c.id}`,
        group: "Companies" as const,
        label: c.name,
        sub: c.domain,
        href: `/companies/${c.id}`,
        stage: c.stage,
      }));
    const contacts: Item[] = (index?.contacts ?? [])
      .filter((c) => match(c.name) || match(c.company_name))
      .slice(0, q ? 8 : 4)
      .map((c) => ({
        key: `ct-${c.id}`,
        group: "Contacts" as const,
        label: c.name,
        sub: [c.title, c.company_name].filter(Boolean).join(" · ") || null,
        href: `/contacts/${c.id}`,
        icon: UserRound,
      }));
    return [...pages, ...companies, ...contacts];
  }, [query, index]);

  const select = useCallback(
    (item: Item) => {
      setOpenAndReset(false);
      router.push(item.href);
    },
    [router, setOpenAndReset]
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && items[active]) {
      e.preventDefault();
      select(items[active]);
    }
  }

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  let lastGroup: string | null = null;

  return (
    <Dialog open={open} onOpenChange={setOpenAndReset}>
      <DialogContent
        showCloseButton={false}
        className="top-[20%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search companies, contacts, pages…"
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            role="combobox"
            aria-expanded="true"
            aria-controls="search-command-list"
            aria-label="Search"
          />
          <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:block">
            ESC
          </kbd>
        </div>
        <div
          ref={listRef}
          id="search-command-list"
          role="listbox"
          className="max-h-80 overflow-y-auto p-1.5"
        >
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No results for “{query}”
            </p>
          ) : (
            items.map((item, i) => {
              const heading =
                item.group !== lastGroup ? (
                  <p
                    key={`h-${item.group}`}
                    className="px-2.5 pt-2 pb-1 text-xs font-medium text-muted-foreground"
                  >
                    {item.group}
                  </p>
                ) : null;
              lastGroup = item.group;
              return (
                <div key={item.key}>
                  {heading}
                  <button
                    type="button"
                    data-index={i}
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => select(item)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm",
                      i === active ? "bg-accent text-accent-foreground" : "text-foreground"
                    )}
                  >
                    {item.stage ? (
                      <StageDot stage={item.stage} className="mx-1" />
                    ) : item.icon ? (
                      <item.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    ) : null}
                    <span className="truncate">{item.label}</span>
                    {item.sub ? (
                      <span className="ml-auto truncate pl-4 text-xs text-muted-foreground">
                        {item.sub}
                      </span>
                    ) : null}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
