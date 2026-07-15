import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Sparkles } from "lucide-react";
import { getAuthContext } from "@/lib/supabase/server";
import { formatDate } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NewCompanyDialog } from "./new-company-dialog";
import { loadDemoData } from "./actions";

export const metadata = { title: "Companies" };

export default async function CompaniesPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const { data: companies } = await auth.supabase
    .from("companies")
    .select("id, name, domain, industry, country, status, last_researched_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Companies</h1>
        <NewCompanyDialog />
      </div>

      {companies && companies.length > 0 ? (
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Researched</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/companies/${c.id}`}
                      className="font-medium hover:underline"
                    >
                      {c.name}
                    </Link>
                    {c.domain && (
                      <div className="text-xs text-muted-foreground">
                        {c.domain}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{c.industry ?? "—"}</TableCell>
                  <TableCell>{c.country ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.last_researched_at ? (
                      <span className="inline-flex items-center gap-1">
                        <Sparkles className="size-3 text-primary" />
                        {formatDate(c.last_researched_at)}
                      </span>
                    ) : (
                      "Not yet"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed bg-background py-16 text-center">
          <Building2 className="size-10 text-muted-foreground" />
          <div>
            <p className="font-medium">No companies yet</p>
            <p className="text-sm text-muted-foreground">
              Add your first company, or load demo data to explore.
            </p>
          </div>
          <div className="flex gap-2">
            <NewCompanyDialog />
            <form action={loadDemoData}>
              <Button variant="outline" type="submit">
                Load demo data
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
