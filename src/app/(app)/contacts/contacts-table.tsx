"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Phone, Search, SearchX } from "lucide-react";
import { formatRelative } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ContactRow = {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  companyId: string;
  companyName: string;
  lastInteractionAt: string | null;
};

const ALL = "all";

export function ContactsTable({ rows }: { rows: ContactRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState(ALL);

  const companies = useMemo(
    () => [...new Set(rows.map((r) => r.companyName))].sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (
        q &&
        !`${r.name} ${r.title ?? ""} ${r.email ?? ""} ${r.companyName}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      if (company !== ALL && r.companyName !== company) return false;
      return true;
    });
  }, [rows, query, company]);

  const companyItems = [
    { value: ALL, label: "All companies" },
    ...companies.map((c) => ({ value: c, label: c })),
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts…"
            className="pl-8"
            aria-label="Search contacts"
          />
        </div>
        <Select items={companyItems} value={company} onValueChange={(v) => setCompany(v as string)}>
          <SelectTrigger aria-label="Filter by company">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {companyItems.map((i) => (
              <SelectItem key={i.value} value={i.value}>
                {i.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto hidden text-xs text-muted-foreground sm:block">
          {filtered.length} of {rows.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-14 text-center">
          <SearchX className="size-5 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">No contacts match your search.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setQuery("");
              setCompany(ALL);
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Role</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="hidden xl:table-cell">Phone</TableHead>
                <TableHead className="hidden md:table-cell">Last interaction</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow
                  key={r.id}
                  onClick={() => router.push(`/contacts/${r.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                        {r.name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((p) => p.charAt(0).toUpperCase())
                          .join("")}
                      </span>
                      <Link
                        href={`/contacts/${r.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium hover:underline"
                      >
                        {r.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {r.title ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/companies/${r.companyId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {r.companyName}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {r.email ? (
                      <span className="flex items-center gap-1.5">
                        <Mail className="size-3.5" aria-hidden />
                        {r.email}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground xl:table-cell">
                    {r.phone ? (
                      <span className="flex items-center gap-1.5">
                        <Phone className="size-3.5" aria-hidden />
                        {r.phone}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {r.lastInteractionAt ? formatRelative(r.lastInteractionAt) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
