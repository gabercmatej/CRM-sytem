"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, SearchX } from "lucide-react";
import type { DealStage } from "@/lib/database.types";
import {
  PIPELINE_STAGES,
  STAGE_ORDER,
  formatDate,
  formatMoney,
  formatRelative,
} from "@/lib/constants";
import { StageBadge } from "@/components/stage-badge";
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

export type CompanyRow = {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  country: string | null;
  stage: DealStage;
  created_at: string;
  revenue: number;
  contactName: string | null;
  lastActivityAt: string | null;
};

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "name", label: "Name A–Z" },
  { value: "stage", label: "Pipeline stage" },
  { value: "revenue", label: "Revenue potential" },
  { value: "activity", label: "Last activity" },
] as const;

type SortKey = (typeof SORTS)[number]["value"];

const ALL = "all";

export function CompaniesTable({
  rows,
  currency = "EUR",
}: {
  rows: CompanyRow[];
  currency?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<string>(ALL);
  const [industry, setIndustry] = useState<string>(ALL);
  const [country, setCountry] = useState<string>(ALL);
  const [sort, setSort] = useState<SortKey>("newest");

  const industries = useMemo(
    () => [...new Set(rows.map((r) => r.industry).filter((v): v is string => !!v))].sort(),
    [rows]
  );
  const countries = useMemo(
    () => [...new Set(rows.map((r) => r.country).filter((v): v is string => !!v))].sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (q && !`${r.name} ${r.domain ?? ""} ${r.contactName ?? ""}`.toLowerCase().includes(q))
        return false;
      if (stage !== ALL && r.stage !== stage) return false;
      if (industry !== ALL && r.industry !== industry) return false;
      if (country !== ALL && r.country !== country) return false;
      return true;
    });
    const time = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);
    switch (sort) {
      case "name":
        out.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "stage":
        out.sort((a, b) => STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage]);
        break;
      case "revenue":
        out.sort((a, b) => b.revenue - a.revenue);
        break;
      case "activity":
        out.sort((a, b) => time(b.lastActivityAt) - time(a.lastActivityAt));
        break;
      default:
        out.sort((a, b) => time(b.created_at) - time(a.created_at));
    }
    return out;
  }, [rows, query, stage, industry, country, sort]);

  const stageItems = [
    { value: ALL, label: "All stages" },
    ...PIPELINE_STAGES.map((s) => ({ value: s.value as string, label: s.label })),
  ];
  const industryItems = [
    { value: ALL, label: "All industries" },
    ...industries.map((i) => ({ value: i, label: i })),
  ];
  const countryItems = [
    { value: ALL, label: "All countries" },
    ...countries.map((c) => ({ value: c, label: c })),
  ];
  const sortItems = SORTS.map((s) => ({ value: s.value as string, label: s.label }));

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
            placeholder="Search companies…"
            className="pl-8"
            aria-label="Search companies"
          />
        </div>
        <Select items={stageItems} value={stage} onValueChange={(v) => setStage(v as string)}>
          <SelectTrigger aria-label="Filter by stage">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {stageItems.map((i) => (
              <SelectItem key={i.value} value={i.value}>
                {i.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {industries.length > 0 && (
          <Select
            items={industryItems}
            value={industry}
            onValueChange={(v) => setIndustry(v as string)}
          >
            <SelectTrigger aria-label="Filter by industry">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {industryItems.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {countries.length > 0 && (
          <Select
            items={countryItems}
            value={country}
            onValueChange={(v) => setCountry(v as string)}
          >
            <SelectTrigger aria-label="Filter by country">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {countryItems.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:block">
            {filtered.length} of {rows.length}
          </span>
          <Select items={sortItems} value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger aria-label="Sort companies">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortItems.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-14 text-center">
          <SearchX className="size-5 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">No companies match your filters.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setQuery("");
              setStage(ALL);
              setIndustry(ALL);
              setCountry(ALL);
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
                <TableHead>Company</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="hidden md:table-cell">Industry</TableHead>
                <TableHead className="hidden lg:table-cell">Country</TableHead>
                <TableHead className="text-right">Potential</TableHead>
                <TableHead className="hidden xl:table-cell">Contact</TableHead>
                <TableHead className="hidden lg:table-cell">Added</TableHead>
                <TableHead className="hidden md:table-cell">Last activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow
                  key={r.id}
                  onClick={() => router.push(`/companies/${r.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell className="max-w-56">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                        {r.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/companies/${r.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="block truncate font-medium text-foreground hover:underline"
                        >
                          {r.name}
                        </Link>
                        {r.domain ? (
                          <p className="truncate text-xs text-muted-foreground">{r.domain}</p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StageBadge stage={r.stage} />
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {r.industry ?? "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {r.country ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {r.revenue > 0 ? formatMoney(r.revenue, currency) : "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground xl:table-cell">
                    {r.contactName ?? "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {formatDate(r.created_at)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {r.lastActivityAt ? formatRelative(r.lastActivityAt) : "—"}
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
