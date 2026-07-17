"use server";

import { getAuthContext } from "@/lib/supabase/server";
import type { DealStage } from "@/lib/database.types";

export type SearchIndex = {
  companies: {
    id: string;
    name: string;
    domain: string | null;
    stage: DealStage;
  }[];
  contacts: {
    id: string;
    name: string;
    title: string | null;
    company_id: string;
    company_name: string | null;
  }[];
};

/** Lightweight index for the ⌘K palette — companies + contacts by name. */
export async function getSearchIndex(): Promise<SearchIndex> {
  const auth = await getAuthContext();
  if (!auth) return { companies: [], contacts: [] };

  const [companiesRes, contactsRes] = await Promise.all([
    auth.supabase
      .from("companies")
      .select("id, name, domain, stage")
      .order("name")
      .limit(500),
    auth.supabase
      .from("contacts")
      .select("id, name, title, company_id")
      .order("name")
      .limit(500),
  ]);

  const companies = companiesRes.data ?? [];
  const companyName = new Map(companies.map((c) => [c.id, c.name]));

  return {
    companies,
    contacts: (contactsRes.data ?? []).map((c) => ({
      ...c,
      company_name: companyName.get(c.company_id) ?? null,
    })),
  };
}
