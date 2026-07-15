"use client";

import { useState } from "react";
import { Check, Copy, Mail, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import type { Contact } from "@/lib/database.types";
import { readSseStream } from "@/lib/sse";
import { logEmailSent } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

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

export function EmailTab({
  companyId,
  contacts,
}: {
  companyId: string;
  contacts: Contact[];
}) {
  const [contactId, setContactId] = useState<string>(contacts[0]?.id ?? "");
  const [goal, setGoal] = useState("first_touch");
  const [tone, setTone] = useState(TONES[0].value);
  const [language, setLanguage] = useState("en");
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const subjectMatch = raw.match(/^SUBJECT:\s*(.+)$/m);
  const subject = subjectMatch?.[1]?.trim() ?? "";
  const body = subjectMatch
    ? raw.slice((subjectMatch.index ?? 0) + subjectMatch[0].length).trim()
    : raw.trim();

  async function generate() {
    setBusy(true);
    setRaw("");
    setCopied(false);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          contactId: contactId || null,
          goal,
          tone,
          language,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await readSseStream<SSE>(res, (event) => {
        if (event.type === "text") setRaw((r) => r + event.text);
        else if (event.type === "error") toast.error(event.message);
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Draft failed");
    } finally {
      setBusy(false);
    }
  }

  async function copyEmail() {
    await navigator.clipboard.writeText(
      subject ? `Subject: ${subject}\n\n${body}` : body
    );
    setCopied(true);
    toast.success("Copied — paste it into Gmail");
    setTimeout(() => setCopied(false), 2000);
  }

  async function markSent() {
    await logEmailSent(companyId, contactId || null, subject || "Outreach email", body, 3);
    toast.success("Logged as sent · follow-up task created for 3 days from now");
  }

  const selectClass =
    "border-input h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="size-4" /> Draft an email
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="contact">To</Label>
            <select
              id="contact"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className={selectClass}
            >
              <option value="">(no specific contact)</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.title ? ` — ${c.title}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="goal">Goal</Label>
            <select
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className={selectClass}
            >
              {GOALS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="tone">Tone</Label>
              <select
                id="tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className={selectClass}
              >
                {TONES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="language">Language</Label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={selectClass}
              >
                <option value="en">English</option>
                <option value="sl">Slovenščina</option>
              </select>
            </div>
          </div>
          <Button onClick={generate} disabled={busy}>
            {busy ? "Writing…" : raw ? "Regenerate" : "Generate email"}
            {!busy && raw && <RotateCcw className="size-4" />}
          </Button>
          <p className="text-xs text-muted-foreground">
            Drafts are grounded in the research report and knowledge base — run
            research first for the best personalization.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Draft</CardTitle>
          {raw && !busy && (
            <div className="flex gap-2">
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
          {raw ? (
            <div className="space-y-3">
              {subject && (
                <div className="rounded-md border bg-muted/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Subject</p>
                  <p className="text-sm font-medium">{subject}</p>
                </div>
              )}
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{body}</p>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {busy
                ? "The draft will stream in here…"
                : "Pick a contact and goal, then generate. You copy the result into Gmail — the app logs it and schedules the follow-up."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
