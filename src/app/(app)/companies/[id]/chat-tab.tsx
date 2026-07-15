"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Plus, SendHorizonal, User } from "lucide-react";
import { toast } from "sonner";
import { readSseStream } from "@/lib/sse";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type SSE =
  | { type: "text"; text: string }
  | { type: "sources"; sources: string[] }
  | { type: "done"; conversationId: string }
  | { type: "error"; message: string };

type Message = { role: "user" | "assistant"; content: string; sources?: string[] };

const QUICK_PROMPTS = [
  "What is this company's biggest problem we could solve?",
  "Which AI automations could we sell them, ranked by impact?",
  "Draft a personalized first-touch email in Slovene.",
  "Summarize everything we know about them in 5 bullets.",
];

export function ChatTab({
  companyId,
  initialConversationId = null,
  initialMessages = [],
}: {
  companyId: string;
  initialConversationId?: string | null;
  initialMessages?: Message[];
}) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;

    setInput("");
    setBusy(true);
    setMessages((m) => [
      ...m,
      { role: "user", content: question },
      { role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, conversationId, message: question }),
      });
      if (!res.ok) throw new Error(await res.text());

      await readSseStream<SSE>(res, (event) => {
        if (event.type === "text") {
          setMessages((m) => {
            const copy = [...m];
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = {
              ...last,
              content: last.content + event.text,
            };
            return copy;
          });
        } else if (event.type === "sources") {
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = {
              ...copy[copy.length - 1],
              sources: event.sources,
            };
            return copy;
          });
        } else if (event.type === "done") {
          setConversationId(event.conversationId);
        } else if (event.type === "error") {
          toast.error(event.message);
        }
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Chat failed");
      setMessages((m) => m.slice(0, -1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[36rem] flex-col rounded-lg border bg-background">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <p className="text-sm font-medium">Company Brain</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setConversationId(null);
            setMessages([]);
          }}
        >
          <Plus className="size-4" /> New chat
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <Bot className="size-10 text-muted-foreground" />
            <p className="max-w-sm text-sm text-muted-foreground">
              Ask anything about this company. Answers are grounded in the
              knowledge base and research reports.
            </p>
            <div className="flex max-w-lg flex-wrap justify-center gap-2">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-3",
              msg.role === "user" && "flex-row-reverse"
            )}
          >
            <div className="mt-1 shrink-0 rounded-full bg-muted p-1.5">
              {msg.role === "user" ? (
                <User className="size-3.5" />
              ) : (
                <Bot className="size-3.5" />
              )}
            </div>
            <div
              className={cn(
                "max-w-[80%] space-y-2 rounded-lg px-3 py-2 text-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              {msg.content ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <Loader2 className="size-4 animate-spin" />
              )}
              {msg.sources && msg.sources.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {msg.sources.map((s) => (
                    <Badge key={s} variant="outline" className="text-[10px]">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2 border-t p-3"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Ask about this company…"
          rows={1}
          className="max-h-32 min-h-9 resize-none"
        />
        <Button type="submit" size="icon" disabled={busy || !input.trim()}>
          <SendHorizonal className="size-4" />
        </Button>
      </form>
    </div>
  );
}
