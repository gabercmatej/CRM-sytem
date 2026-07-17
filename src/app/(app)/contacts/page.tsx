import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { getAuthContext } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { NewContactDialog } from "./new-contact-dialog";
import { ContactsTable, type ContactRow } from "./contacts-table";

export const metadata = { title: "Contacts" };

export default async function ContactsPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const [contactsRes, companiesRes, activitiesRes] = await Promise.all([
    auth.supabase
      .from("contacts")
      .select("id, name, title, email, phone, company_id, created_at")
      .order("name"),
    auth.supabase.from("companies").select("id, name").order("name"),
    auth.supabase
      .from("activities")
      .select("contact_id, created_at")
      .not("contact_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);

  const companies = companiesRes.data ?? [];
  const companyName = new Map(companies.map((c) => [c.id, c.name]));

  const lastInteraction = new Map<string, string>();
  for (const a of activitiesRes.data ?? []) {
    if (a.contact_id && !lastInteraction.has(a.contact_id))
      lastInteraction.set(a.contact_id, a.created_at);
  }

  const rows: ContactRow[] = (contactsRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    title: c.title,
    email: c.email,
    phone: c.phone,
    companyId: c.company_id,
    companyName: companyName.get(c.company_id) ?? "—",
    lastInteractionAt: lastInteraction.get(c.id) ?? null,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Contacts"
        description="Everyone you know, across every company."
        actions={
          rows.length > 0 && companies.length > 0 ? (
            <NewContactDialog companies={companies} />
          ) : undefined
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description={
            companies.length === 0
              ? "Add a company first — contacts always belong to a company."
              : "Add the people you're selling to. Every contact links back to its company."
          }
          action={
            companies.length > 0 ? <NewContactDialog companies={companies} /> : undefined
          }
        />
      ) : (
        <ContactsTable rows={rows} />
      )}
    </div>
  );
}
