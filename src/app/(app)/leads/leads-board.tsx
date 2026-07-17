"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Globe, Plus, Sparkles, Telescope, X } from "lucide-react";
import { toast } from "sonner";
import type { Lead } from "@/lib/database.types";
import { readSseStream } from "@/lib/sse";
import { NewCompanyDialog } from "../companies/new-company-dialog";
import { createCompanyFromLead, dismissLead } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SSE =
  | { type: "status"; message: string }
  | { type: "text"; text: string }
  | { type: "tool"; name: string }
  | { type: "leads"; leads: Lead[] }
  | { type: "error"; message: string }
  | { type: "done" };

const TOOL_LABELS: Record<string, string> = {
  web_search: "Searching the web",
  web_fetch: "Reading a page",
};

const EXAMPLES = [
  "Mid-size manufacturing companies in Slovenia or Austria with legacy processes",
  "Logistics companies in the DACH region, 100–1000 employees, hiring ops roles",
  "Growing e-commerce brands in the EU with visible customer-support pain",
];

export function LeadsBoard({ initialLeads }: { initialLeads: Lead[] }) {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [query, setQuery] = useState("");
  const [running, setRunning] = useState(false);
  const [feed, setFeed] = useState<{ kind: "status" | "tool"; text: string }[]>([]);
  const [narration, setNarration] = useState("");

  async function search() {
    if (!query.trim() || running) return;
    setRunning(true);
    setFeed([]);
    setNarration("");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) throw new Error(await res.text());

      await readSseStream<SSE>(res, (event) => {
        if (event.type === "status") {
          setFeed((f) => [...f, { kind: "status", text: event.message }]);
        } else if (event.type === "tool") {
          setFeed((f) => [
            ...f,
            { kind: "tool", text: TOOL_LABELS[event.name] ?? event.name },
          ]);
        } else if (event.type === "text") {
          setNarration((n) => (n + event.text).slice(-1500));
        } else if (event.type === "leads") {
          setLeads((current) => [...event.leads, ...current]);
          toast.success(
            event.leads.length > 0
              ? `Found ${event.leads.length} new ${event.leads.length === 1 ? "lead" : "leads"}`
              : "No new companies found — everything matching is already in your CRM"
          );
          router.refresh();
        } else if (event.type === "error") {
          toast.error(event.message);
        }
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lead discovery failed");
    } finally {
      setRunning(false);
    }
  }

  async function dismiss(lead: Lead) {
    setLeads((l) => l.filter((x) => x.id !== lead.id));
    try {
      await dismissLead(lead.id);
    } catch {
      setLeads((l) => [lead, ...l]);
      toast.error("Could not dismiss the lead");
    }
  }

  return (
    <div className="space-y-6">
      <Card size="sm">
        <CardContent className="space-y-3 pt-(--card-spacing)">
          <div className="grid gap-2">
            <Label htmlFor="lead-query">Who are you looking for?</Label>
            <Textarea
              id="lead-query"
              rows={2}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={EXAMPLES[0]}
              disabled={running}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={search} disabled={running || !query.trim()}>
              <Telescope className="size-4" />
              {running ? "Searching…" : "Find leads"}
            </Button>
            {!running &&
              EXAMPLES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setQuery(e)}
                  className="max-w-72 truncate rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {e}
                </button>
              ))}
          </div>
          {running && (
            <div className="space-y-2 border-t pt-3" aria-live="polite">
              <div className="flex flex-wrap gap-1.5">
                {feed.map((item, i) => (
                  <Badge key={i} variant={item.kind === "status" ? "secondary" : "outline"}>
                    {item.text}
                  </Badge>
                ))}
              </div>
              {narration && (
                <p className="border-l-2 border-ai/40 pl-3 text-sm whitespace-pre-wrap text-muted-foreground">
                  {narration}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {leads.length === 0 && !running ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
          <div className="flex size-10 items-center justify-center rounded-lg bg-ai/10">
            <Sparkles className="size-5 text-ai" aria-hidden />
          </div>
          <p className="text-sm font-medium">No suggested leads yet</p>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Describe your ideal customer above. Discovered companies appear here —
            review them, then add the good ones to your CRM with one click.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {leads.map((lead) => (
            <Card key={lead.id} size="sm" className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-3 pt-(--card-spacing)">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{lead.name}</p>
                    {lead.domain ? (
                      <a
                        href={`https://${lead.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Globe className="size-3" aria-hidden />
                        {lead.domain}
                      </a>
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground"
                    onClick={() => dismiss(lead)}
                    aria-label={`Dismiss ${lead.name}`}
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {lead.industry && <Badge variant="secondary">{lead.industry}</Badge>}
                  {lead.country && <Badge variant="outline">{lead.country}</Badge>}
                  {lead.size && <Badge variant="outline">{lead.size}</Badge>}
                </div>

                {lead.description && (
                  <p className="text-sm text-muted-foreground">{lead.description}</p>
                )}

                {lead.fit_reason && (
                  <p className="rounded-lg bg-ai/5 p-2.5 text-sm text-foreground/90 ring-1 ring-ai/20">
                    <Sparkles className="mr-1.5 inline size-3.5 text-ai" aria-hidden />
                    {lead.fit_reason}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <NewCompanyDialog
                    title={`Add ${lead.name}`}
                    submitLabel="Add company"
                    action={createCompanyFromLead.bind(null, lead.id)}
                    prefill={{
                      name: lead.name,
                      domain: lead.domain,
                      industry: lead.industry,
                      country: lead.country,
                      size: lead.size,
                      notes: [lead.description, lead.fit_reason]
                        .filter(Boolean)
                        .join("\n\n"),
                    }}
                    trigger={
                      <Button size="sm">
                        <Plus className="size-4" />
                        Add company
                      </Button>
                    }
                  />
                  {lead.source_url ? (
                    <a
                      href={lead.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Source <ExternalLink className="size-3" aria-hidden />
                    </a>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
