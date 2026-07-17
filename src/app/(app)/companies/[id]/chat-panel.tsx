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

export type ChatMessageItem = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
};

const QUICK_PROMPTS = [
  "What is this company's biggest problem we could solve?",
  "Which AI automations could we sell them, ranked by impact?",
  "What should our first outreach message focus on?",
  "Summarize everything we know about them in 5 bullets.",
];

/** Grounded chat over the company's knowledge base ("Company Brain"). */
export function ChatPanel({
  companyId,
  initialConversationId = null,
  initialMessages = [],
  className,
}: {
  companyId: string;
  initialConversationId?: string | null;
  initialMessages?: ChatMessageItem[];
  className?: string;
}) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
            copy[copy.length - 1] = { ...last, content: last.content + event.text };
            return copy;
          });
        } else if (event.type === "sources") {
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = { ...copy[copy.length - 1], sources: event.sources };
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
      setMessages((m) => m.slice(0, -2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="Company Brain chat"
      className={cn(
        "flex h-[34rem] flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10",
        className
      )}
    >
      <div className="flex items-center justify-between border-b px-4 py-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Bot className="size-4 text-ai" aria-hidden />
          Company Brain
        </p>
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
            <div className="flex size-10 items-center justify-center rounded-lg bg-ai/10">
              <Bot className="size-5 text-ai" aria-hidden />
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">
              Ask anything about this company — answers are grounded in research
              reports and the knowledge base.
            </p>
            <div className="flex max-w-md flex-wrap justify-center gap-2">
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
            className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}
          >
            <div className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
              {msg.role === "user" ? (
                <User className="size-3.5 text-muted-foreground" aria-hidden />
              ) : (
                <Bot className="size-3.5 text-ai" aria-hidden />
              )}
            </div>
            <div
              className={cn(
                "max-w-[85%] space-y-2 rounded-lg px-3 py-2 text-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              {msg.content ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <Loader2 className="size-4 animate-spin" aria-label="Thinking" />
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
          aria-label="Message Company Brain"
        />
        <Button
          type="submit"
          size="icon"
          disabled={busy || !input.trim()}
          aria-label="Send"
        >
          <SendHorizonal className="size-4" />
        </Button>
      </form>
    </section>
  );
}
