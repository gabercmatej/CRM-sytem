"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Globe,
  Loader2,
  NotebookPen,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import type { Company, DocumentSource, KbDocument } from "@/lib/database.types";
import { formatDate } from "@/lib/constants";
import { deleteDocument } from "../actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const SOURCE_ICONS: Record<DocumentSource, React.ElementType> = {
  website: Globe,
  pdf: FileText,
  manual: NotebookPen,
  research_report: Sparkles,
};

/** Knowledge base list + ingestion actions (crawl / PDF / note). */
export function KnowledgeSection({
  company,
  documents,
}: {
  company: Company;
  documents: KbDocument[];
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);

  async function crawlWebsite() {
    if (!company.domain) {
      toast.error("Set the company's website domain first (Overview tab).");
      return;
    }
    setBusy("Crawling website — this can take a minute…");
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.id,
          mode: "website",
          url: company.domain,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Crawl failed");
      toast.success(`Added ${json.documents} pages (${json.chunks} chunks)`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Crawl failed");
    } finally {
      setBusy(null);
    }
  }

  async function uploadPdf(file: File) {
    setBusy(`Reading ${file.name}…`);
    try {
      const formData = new FormData();
      formData.set("companyId", company.id);
      formData.set("file", file);
      const res = await fetch("/api/ingest", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      toast.success(`Added ${file.name} (${json.chunkCount} chunks)`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function addNote(formData: FormData) {
    setNoteOpen(false);
    setBusy("Saving note…");
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.id,
          mode: "note",
          title: String(formData.get("title") ?? "Note"),
          content: String(formData.get("content") ?? ""),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not save note");
      toast.success("Note added to the knowledge base");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save note");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-label="Knowledge base" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">
          Knowledge base
          {documents.length > 0 ? (
            <span className="ml-1.5 font-normal text-muted-foreground">
              {documents.length} {documents.length === 1 ? "source" : "sources"}
            </span>
          ) : null}
        </h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={crawlWebsite} disabled={!!busy}>
            <Globe className="size-4" /> Crawl website
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInput.current?.click()}
            disabled={!!busy}
          >
            <Upload className="size-4" /> Upload PDF
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadPdf(file);
            }}
          />
          <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
            <DialogTrigger
              render={
                <Button size="sm" variant="outline" disabled={!!busy}>
                  <NotebookPen className="size-4" /> Add note
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add note to knowledge base</DialogTitle>
              </DialogHeader>
              <form action={addNote} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="kb-note-title">Title</Label>
                  <Input id="kb-note-title" name="title" placeholder="Meeting notes 15 Jul" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="kb-note-content">Content *</Label>
                  <Textarea id="kb-note-content" name="content" rows={8} required />
                </div>
                <Button type="submit">Save note</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {busy && (
        <div
          className="flex items-center gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground"
          role="status"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden /> {busy}
        </div>
      )}

      {documents.length === 0 && !busy ? (
        <div className="rounded-xl border border-dashed px-4 py-8 text-center">
          <p className="text-sm font-medium">Knowledge base is empty</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Crawl the website, upload PDFs or add notes — everything becomes
            searchable for chat, emails and proposals. Research reports land here
            automatically.
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {documents.map((doc) => {
            const Icon = SOURCE_ICONS[doc.source] ?? FileText;
            return (
              <li
                key={doc.id}
                className="flex items-center gap-3 rounded-lg bg-card p-2.5 ring-1 ring-foreground/10"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Icon
                    className={
                      doc.source === "research_report"
                        ? "size-3.5 text-ai"
                        : "size-3.5 text-muted-foreground"
                    }
                    aria-hidden
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{doc.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {doc.source.replace("_", " ")} · {formatDate(doc.created_at)}
                    {doc.error ? ` · ${doc.error}` : ""}
                  </p>
                </div>
                {doc.status !== "ready" && (
                  <Badge
                    variant={doc.status === "error" ? "destructive" : "outline"}
                    className="capitalize"
                  >
                    {doc.status}
                  </Badge>
                )}
                <ConfirmDialog
                  title="Remove this source?"
                  description="Its content will no longer ground chat answers, emails or proposals."
                  confirmLabel="Remove"
                  onConfirm={() => deleteDocument(doc.id, company.id)}
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                      aria-label={`Remove ${doc.title}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
