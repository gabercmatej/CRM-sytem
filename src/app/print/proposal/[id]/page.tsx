import { notFound, redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/server";
import type { ProposalSection } from "@/lib/database.types";
import { PrintToolbar } from "./print-toolbar";

export const metadata = { title: "Proposal" };

/** Minimal markdown: paragraphs, "-" bullets, **bold**. Untrusted input stays text. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
      )}
    </>
  );
}

function SectionBody({ body }: { body: string }) {
  const blocks = body.split(/\n{2,}/).filter((b) => b.trim());
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim());
        const isList = lines.every((l) => /^\s*[-*]\s+/.test(l));
        if (isList) {
          return (
            <ul key={i} className="my-3 list-disc space-y-1.5 pl-5">
              {lines.map((l, j) => (
                <li key={j}>
                  <Inline text={l.replace(/^\s*[-*]\s+/, "")} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="my-3">
            <Inline text={lines.join(" ")} />
          </p>
        );
      })}
    </>
  );
}

export default async function ProposalPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const { data: proposal } = await auth.supabase
    .from("proposals")
    .select("*")
    .eq("id", id)
    .single();
  if (!proposal) notFound();

  const [{ data: company }, { data: workspace }] = await Promise.all([
    auth.supabase
      .from("companies")
      .select("name")
      .eq("id", proposal.company_id)
      .single(),
    auth.supabase
      .from("workspaces")
      .select("name")
      .eq("id", auth.workspaceId)
      .single(),
  ]);

  const sections = (proposal.content ?? []) as ProposalSection[];
  const date = new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(
    new Date(proposal.updated_at)
  );

  return (
    // A document, not an app surface: fixed light palette, print-first.
    <div className="min-h-screen bg-white text-neutral-900">
      <style>{`@page { margin: 18mm; } @media print { body { background: white; } }`}</style>
      <PrintToolbar backHref={`/companies/${proposal.company_id}`} />

      <article className="mx-auto max-w-2xl px-8 py-14 print:px-0 print:py-0">
        <header className="border-b border-neutral-200 pb-8">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block size-3 rounded-sm"
              style={{ background: "oklch(0.47 0.17 12)" }}
            />
            <p className="text-sm font-medium text-neutral-500">
              {workspace?.name ?? "Proposal"}
            </p>
          </div>
          <h1 className="mt-6 text-3xl leading-tight font-semibold tracking-tight">
            {proposal.title}
          </h1>
          <p className="mt-3 text-sm text-neutral-500">
            Prepared for {company?.name ?? "—"} · {date}
          </p>
        </header>

        {sections.map((section) => (
          <section key={section.id} className="mt-9">
            <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
            <div className="mt-1 text-[15px] leading-relaxed text-neutral-700">
              <SectionBody body={section.body} />
            </div>
          </section>
        ))}

        <footer className="mt-14 border-t border-neutral-200 pt-6 text-sm text-neutral-400">
          {workspace?.name ? `${workspace.name} · ` : ""}
          {date}
        </footer>
      </article>
    </div>
  );
}
