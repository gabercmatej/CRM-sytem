import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Building2, Inbox } from "lucide-react";
import { getAuthContext } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/constants";
import { PageHeader } from "@/components/page-header";
import { StageBadge } from "@/components/stage-badge";
import { ActivityIcon } from "@/components/activity-icon";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ContactDetailCard } from "./contact-detail-card";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const { data: contact } = await auth.supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();

  if (!contact) notFound();

  const [{ data: company }, { data: activities }] = await Promise.all([
    auth.supabase
      .from("companies")
      .select("id, name, domain, industry, stage")
      .eq("id", contact.company_id)
      .single(),
    auth.supabase
      .from("activities")
      .select("id, type, subject, body, created_at")
      .eq("contact_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        backHref="/contacts"
        backLabel="Contacts"
        title={contact.name}
        description={
          [contact.title, company?.name].filter(Boolean).join(" · ") || undefined
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[3fr_2fr]">
        <ContactDetailCard contact={contact} />

        <div className="space-y-4">
          {company ? (
            <Card size="sm">
              <CardHeader>
                <CardTitle>Company</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/companies/${company.id}`}
                  className="flex items-center gap-3 rounded-lg p-2 -m-2 transition-colors hover:bg-muted/60"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Building2 className="size-4 text-muted-foreground" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {company.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {company.industry ?? company.domain ?? "—"}
                    </span>
                  </span>
                  <StageBadge stage={company.stage} />
                </Link>
              </CardContent>
            </Card>
          ) : null}

          <Card size="sm">
            <CardHeader>
              <CardTitle>Interactions</CardTitle>
            </CardHeader>
            <CardContent>
              {(activities ?? []).length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Inbox className="size-5 text-muted-foreground" aria-hidden />
                  <p className="text-sm text-muted-foreground">
                    Activities logged against this contact will appear here.
                  </p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {(activities ?? []).map((a) => (
                    <li key={a.id} className="flex items-center gap-3 rounded-lg px-1 py-1.5">
                      <ActivityIcon type={a.type} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{a.subject}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatRelative(a.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
