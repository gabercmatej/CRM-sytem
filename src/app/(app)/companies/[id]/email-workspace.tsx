"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Mail,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { Contact, EmailDraft } from "@/lib/database.types";
import { formatRelative } from "@/lib/constants";
import { readSseStream } from "@/lib/sse";
import { deleteEmailDraft, logEmailSent, saveEmailDraft } from "../actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

const GOALS = [
  { value: "first_touch", label: "First touch" },
  { value: "follow_up", label: "Follow-up" },
  { value: "meeting_ask", label: "Meeting ask" },
];

const TONES = [
  { value: "professional but warm", label: "Professional, warm" },
  { value: "short and direct", label: "Short & direct" },
  { value: "casual and friendly", label: "Casual" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "sl", label: "Slovenščina" },
];

const NO_CONTACT = "none";

/** AI email workspace: generate → edit → save draft → log as sent. */
export function EmailWorkspace({
  companyId,
  contacts,
  drafts,
  defaultLanguage = "en",
  followUpDays = 3,
}: {
  companyId: string;
  contacts: Contact[];
  drafts: EmailDraft[];
  defaultLanguage?: string;
  followUpDays?: number;
}) {
  const router = useRouter();
  const [draftId, setDraftId] = useState<string | null>(null);
  const [contactId, setContactId] = useState<string>(contacts[0]?.id ?? NO_CONTACT);
  const [goal, setGoal] = useState(GOALS[0].value);
  const [tone, setTone] = useState(TONES[0].value);
  const [language, setLanguage] = useState(defaultLanguage);
  const [instructions, setInstructions] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasDraft = subject.trim() !== "" || body.trim() !== "";

  function applyRaw(raw: string) {
    const match = raw.match(/^SUBJECT:\s*(.+)$/m);
    if (match) {
      setSubject(match[1].trim());
      setBody(raw.slice((match.index ?? 0) + match[0].length).trimStart());
    } else {
      setBody(raw);
    }
  }

  async function generate() {
    setBusy(true);
    setSubject("");
    setBody("");
    setCopied(false);
    let raw = "";
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          contactId: contactId === NO_CONTACT ? null : contactId,
          goal,
          tone,
          language,
          instructions: instructions.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await readSseStream<SSE>(res, (event) => {
        if (event.type === "text") {
          raw += event.text;
          applyRaw(raw);
        } else if (event.type === "error") {
          toast.error(event.message);
        }
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Draft failed");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const { id } = await saveEmailDraft(companyId, {
        id: draftId,
        contactId: contactId === NO_CONTACT ? null : contactId,
        subject,
        body,
        goal,
        tone,
        language,
        instructions: instructions.trim() || null,
      });
      setDraftId(id);
      toast.success("Draft saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save draft");
    } finally {
      setSaving(false);
    }
  }

  function loadDraft(d: EmailDraft) {
    setDraftId(d.id);
    setContactId(d.contact_id ?? NO_CONTACT);
    setGoal(d.goal);
    setTone(d.tone);
    setLanguage(d.language);
    setInstructions(d.instructions ?? "");
    setSubject(d.subject);
    setBody(d.body);
    setCopied(false);
  }

  function newDraft() {
    setDraftId(null);
    setSubject("");
    setBody("");
    setInstructions("");
    setCopied(false);
  }

  async function copyEmail() {
    await navigator.clipboard.writeText(
      subject ? `Subject: ${subject}\n\n${body}` : body
    );
    setCopied(true);
    toast.success("Copied — paste it into your email client");
    setTimeout(() => setCopied(false), 2000);
  }

  async function markSent() {
    await logEmailSent(
      companyId,
      contactId === NO_CONTACT ? null : contactId,
      subject || "Outreach email",
      body,
      followUpDays,
      draftId
    );
    toast.success(
      followUpDays > 0
        ? `Logged as sent · follow-up task in ${followUpDays} ${followUpDays === 1 ? "day" : "days"}`
        : "Logged as sent"
    );
    router.refresh();
  }

  const contactItems = [
    { value: NO_CONTACT, label: "(no specific contact)" },
    ...contacts.map((c) => ({
      value: c.id,
      label: c.title ? `${c.name} — ${c.title}` : c.name,
    })),
  ];

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[2fr_3fr]">
      <div className="space-y-4">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Mail className="size-4 text-muted-foreground" aria-hidden />
              Compose
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email-contact">To</Label>
              <Select
                items={contactItems}
                value={contactId}
                onValueChange={(v) => setContactId(v as string)}
              >
                <SelectTrigger id="email-contact" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contactItems.map((i) => (
                    <SelectItem key={i.value} value={i.value}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="email-goal">Goal</Label>
                <Select items={GOALS} value={goal} onValueChange={(v) => setGoal(v as string)}>
                  <SelectTrigger id="email-goal" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOALS.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email-tone">Tone</Label>
                <Select items={TONES} value={tone} onValueChange={(v) => setTone(v as string)}>
                  <SelectTrigger id="email-tone" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email-language">Language</Label>
              <Select
                items={LANGUAGES}
                value={language}
                onValueChange={(v) => setLanguage(v as string)}
              >
                <SelectTrigger id="email-language" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email-instructions">Custom instructions</Label>
              <Textarea
                id="email-instructions"
                rows={3}
                placeholder="e.g. Mention their new Berlin warehouse. Reference our logistics case study."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </div>
            <Button onClick={generate} disabled={busy}>
              {busy ? (
                "Writing…"
              ) : hasDraft ? (
                <>
                  <RotateCcw className="size-4" /> Regenerate
                </>
              ) : (
                <>
                  <Sparkles className="size-4" /> Generate email
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Drafts are grounded in the research report and knowledge base — run
              research first for the best personalization.
            </p>
          </CardContent>
        </Card>

        {drafts.length > 0 && (
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-sm">Saved drafts</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {drafts.map((d) => (
                  <li key={d.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadDraft(d)}
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/60",
                        d.id === draftId && "bg-muted/60"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {d.subject || "(no subject)"}
                        </p>
                        <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                          {formatRelative(d.updated_at)}
                        </p>
                      </div>
                      {d.status === "sent" && (
                        <Badge variant="secondary" className="shrink-0">
                          Sent
                        </Badge>
                      )}
                    </button>
                    <ConfirmDialog
                      title="Delete this draft?"
                      confirmLabel="Delete"
                      onConfirm={async () => {
                        await deleteEmailDraft(d.id, companyId);
                        if (d.id === draftId) newDraft();
                        router.refresh();
                      }}
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0 text-muted-foreground"
                          aria-label={`Delete draft “${d.subject || "no subject"}”`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      }
                    />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {draftId ? "Editing draft" : "Draft"}
          </CardTitle>
          {hasDraft && !busy && (
            <div className="col-start-2 row-span-2 row-start-1 flex gap-2 self-start justify-self-end">
              <Button size="sm" variant="outline" onClick={save} disabled={saving}>
                <Save className="size-4" />
                {saving ? "Saving…" : "Save draft"}
              </Button>
              <Button size="sm" variant="outline" onClick={copyEmail}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                Copy
              </Button>
              <Button size="sm" onClick={markSent}>
                <Send className="size-4" /> Log as sent
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {hasDraft || busy ? (
            <div className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="email-subject">Subject</Label>
                <Input
                  id="email-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={busy}
                  placeholder="Subject line"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email-body">Body</Label>
                <Textarea
                  id="email-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  disabled={busy}
                  rows={16}
                  className="leading-relaxed"
                  placeholder="The draft streams in here…"
                />
              </div>
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                Pick a contact and goal, then generate. Edit the result freely —
                save it as a draft, copy it into your email client, and log it as
                sent to schedule the follow-up.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
