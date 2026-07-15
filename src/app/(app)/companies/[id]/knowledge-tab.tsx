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

export function KnowledgeTab({
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Everything here is searchable by the company chat and email generator.
        </p>
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
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" name="title" placeholder="Meeting notes 15 Jul" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="content">Content *</Label>
                  <Textarea id="content" name="content" rows={8} required />
                </div>
                <Button type="submit">Save note</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {busy && (
        <div className="flex items-center gap-2 rounded-md border bg-background p-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {busy}
        </div>
      )}

      {documents.length === 0 && !busy ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-background py-16 text-center">
          <FileText className="size-10 text-muted-foreground" />
          <div>
            <p className="font-medium">Knowledge base is empty</p>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              Crawl the company website, upload PDFs (offers, brochures) or add
              notes. Research reports land here automatically.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const Icon = SOURCE_ICONS[doc.source] ?? FileText;
            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-lg border bg-background p-3"
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.source.replace("_", " ")} · {formatDate(doc.created_at)}
                    {doc.error ? ` · ${doc.error}` : ""}
                  </p>
                </div>
                <Badge
                  variant={
                    doc.status === "ready"
                      ? "secondary"
                      : doc.status === "error"
                        ? "destructive"
                        : "outline"
                  }
                  className="capitalize"
                >
                  {doc.status}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground"
                  onClick={() => deleteDocument(doc.id, company.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
