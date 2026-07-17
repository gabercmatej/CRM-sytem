"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { Proposal, ProposalSection, ProposalStatus } from "@/lib/database.types";
import { formatRelative } from "@/lib/constants";
import { readSseStream } from "@/lib/sse";
import { deleteProposal, saveProposal } from "../actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type SSE =
  | { type: "text"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

const STATUSES: { value: ProposalStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
];

const STATUS_BADGE: Record<ProposalStatus, "outline" | "secondary" | "destructive"> = {
  draft: "outline",
  sent: "secondary",
  accepted: "secondary",
  declined: "destructive",
};

function parseProposal(raw: string): { title: string; sections: ProposalSection[] } {
  const titleMatch = raw.match(/^TITLE:\s*(.+)$/m);
  const title = titleMatch?.[1]?.trim() ?? "Proposal";
  const rest = titleMatch
    ? raw.slice((titleMatch.index ?? 0) + titleMatch[0].length)
    : raw;
  const sections = rest
    .split(/^##\s+/m)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((part) => {
      const [first, ...lines] = part.split("\n");
      return {
        id: crypto.randomUUID(),
        title: first.trim(),
        body: lines.join("\n").trim(),
      };
    });
  return { title, sections };
}

/** Lightweight proposal builder: generate grounded sections, edit, export. */
export function ProposalWorkspace({
  companyId,
  companyName,
  proposals,
}: {
  companyId: string;
  companyName: string;
  proposals: Proposal[];
}) {
  const router = useRouter();
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<ProposalStatus>("draft");
  const [sections, setSections] = useState<ProposalSection[]>([]);
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [streamPreview, setStreamPreview] = useState("");

  const editing = sections.length > 0;

  function loadProposal(p: Proposal) {
    setProposalId(p.id);
    setTitle(p.title);
    setStatus(p.status);
    setSections(p.content ?? []);
    setStreamPreview("");
  }

  function reset() {
    setProposalId(null);
    setTitle("");
    setStatus("draft");
    setSections([]);
    setStreamPreview("");
  }

  async function generate() {
    setBusy(true);
    setSections([]);
    setStreamPreview("");
    let raw = "";
    try {
      const res = await fetch("/api/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          instructions: instructions.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await readSseStream<SSE>(res, (event) => {
        if (event.type === "text") {
          raw += event.text;
          setStreamPreview(raw);
        } else if (event.type === "error") {
          toast.error(event.message);
        }
      });
      if (raw.trim()) {
        const parsed = parseProposal(raw);
        setTitle(parsed.title);
        setSections(parsed.sections);
        setStreamPreview("");
        const { id } = await saveProposal(companyId, {
          id: proposalId,
          title: parsed.title,
          status: "draft",
          content: parsed.sections,
        });
        setProposalId(id);
        setStatus("draft");
        toast.success("Proposal drafted and saved");
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Proposal generation failed");
    } finally {
      setBusy(false);
    }
  }

  async function save(): Promise<string | null> {
    setSaving(true);
    try {
      const { id } = await saveProposal(companyId, {
        id: proposalId,
        title,
        status,
        content: sections,
      });
      setProposalId(id);
      toast.success("Proposal saved");
      router.refresh();
      return id;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save proposal");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function exportPdf() {
    const id = await save();
    if (id) window.open(`/print/proposal/${id}`, "_blank");
  }

  function updateSection(id: string, patch: Partial<ProposalSection>) {
    setSections((s) => s.map((sec) => (sec.id === id ? { ...sec, ...patch } : sec)));
  }

  return (
    <div className="space-y-4">
      {proposals.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {proposals.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => loadProposal(p)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/60",
                p.id === proposalId && "border-ring bg-muted/60"
              )}
            >
              <FileText className="size-3.5 text-muted-foreground" aria-hidden />
              <span className="max-w-48 truncate">{p.title}</span>
              <Badge variant={STATUS_BADGE[p.status]} className="capitalize">
                {p.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatRelative(p.updated_at)}
              </span>
            </button>
          ))}
          {editing && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <Plus className="size-4" /> New proposal
            </Button>
          )}
        </div>
      )}

      {!editing && !busy ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-14 text-center">
          <div className="flex size-10 items-center justify-center rounded-lg bg-ai/10">
            <FileText className="size-5 text-ai" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium">Draft a proposal for {companyName}</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Generates a full proposal — situation, solution, scope, timeline,
              investment — grounded in your research and deals. Every section stays
              editable, and it exports as a clean PDF.
            </p>
          </div>
          <div className="w-full max-w-md space-y-3 text-left">
            <div className="grid gap-2">
              <Label htmlFor="proposal-instructions">Custom instructions (optional)</Label>
              <Textarea
                id="proposal-instructions"
                rows={3}
                placeholder="e.g. Focus on the support-ticket automation. Budget around €15k. Timeline of 8 weeks."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </div>
            <Button onClick={generate} className="w-full" disabled={busy}>
              <Sparkles className="size-4" />
              Generate proposal
            </Button>
          </div>
        </div>
      ) : null}

      {busy && (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="size-4 animate-pulse text-ai" aria-hidden />
              Writing proposal…
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="max-h-72 overflow-y-auto text-sm whitespace-pre-wrap text-muted-foreground">
              {streamPreview || "Gathering research and deal context…"}
            </p>
          </CardContent>
        </Card>
      )}

      {editing && !busy && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid min-w-64 flex-1 gap-2">
              <Label htmlFor="proposal-title">Title</Label>
              <Input
                id="proposal-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="proposal-status">Status</Label>
              <Select
                items={STATUSES}
                value={status}
                onValueChange={(v) => setStatus(v as ProposalStatus)}
              >
                <SelectTrigger id="proposal-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={generate}>
                <RotateCcw className="size-4" /> Regenerate
              </Button>
              <Button variant="outline" onClick={save} disabled={saving}>
                <Save className="size-4" /> {saving ? "Saving…" : "Save"}
              </Button>
              <Button onClick={exportPdf}>
                <Printer className="size-4" /> Export PDF
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {sections.map((section) => (
              <Card key={section.id} size="sm">
                <CardContent className="space-y-2 pt-(--card-spacing)">
                  <div className="flex items-center gap-2">
                    <Input
                      value={section.title}
                      onChange={(e) => updateSection(section.id, { title: e.target.value })}
                      className="border-transparent px-1 text-sm font-semibold shadow-none focus-visible:border-ring"
                      aria-label="Section title"
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-muted-foreground"
                      onClick={() =>
                        setSections((s) => s.filter((sec) => sec.id !== section.id))
                      }
                      aria-label={`Remove section “${section.title}”`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <Textarea
                    value={section.body}
                    onChange={(e) => updateSection(section.id, { body: e.target.value })}
                    rows={Math.min(14, Math.max(4, section.body.split("\n").length + 1))}
                    className="leading-relaxed"
                    aria-label={`Section content: ${section.title}`}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSections((s) => [
                  ...s,
                  { id: crypto.randomUUID(), title: "New section", body: "" },
                ])
              }
            >
              <Plus className="size-4" /> Add section
            </Button>
            {proposalId && (
              <ConfirmDialog
                title="Delete this proposal?"
                description="This can’t be undone."
                confirmLabel="Delete proposal"
                onConfirm={async () => {
                  await deleteProposal(proposalId, companyId);
                  reset();
                  router.refresh();
                }}
                render={
                  <Button variant="ghost" size="sm" className="text-destructive">
                    <Trash2 className="size-4" /> Delete
                  </Button>
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
