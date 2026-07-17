"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Cpu,
  Lightbulb,
  Newspaper,
  Search,
  Sparkles,
  Target,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import type {
  Company,
  KbDocument,
  ResearchReport,
  ResearchRun,
} from "@/lib/database.types";
import { formatDateTime } from "@/lib/constants";
import { readSseStream } from "@/lib/sse";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChatPanel, type ChatMessageItem } from "./chat-panel";
import { KnowledgeSection } from "./knowledge-section";

type SSE =
  | { type: "status"; message: string }
  | { type: "text"; text: string }
  | { type: "tool"; name: string }
  | { type: "report"; report: ResearchReport }
  | { type: "error"; message: string }
  | { type: "done"; runId: string };

const TOOL_LABELS: Record<string, string> = {
  web_search: "Searching the web",
  web_fetch: "Reading a page",
  crawl_site: "Crawling the website",
};

/**
 * The company intelligence workspace: research agent + report on the left,
 * knowledge base below it, grounded chat on the right. One loop — research
 * lands in the KB, the KB grounds the chat.
 */
export function ResearchWorkspace({
  company,
  runs,
  documents,
  initialConversationId,
  initialMessages,
}: {
  company: Company;
  runs: ResearchRun[];
  documents: KbDocument[];
  initialConversationId?: string | null;
  initialMessages?: ChatMessageItem[];
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [feed, setFeed] = useState<{ kind: "status" | "tool"; text: string }[]>([]);
  const [narration, setNarration] = useState("");
  const [liveReport, setLiveReport] = useState<ResearchReport | null>(null);

  const lastCompleted = runs.find((r) => r.status === "completed" && r.report);
  const report = liveReport ?? (lastCompleted?.report as ResearchReport | null);

  async function startResearch() {
    setRunning(true);
    setFeed([]);
    setNarration("");
    setLiveReport(null);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id }),
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
          setNarration((n) => (n + event.text).slice(-2000));
        } else if (event.type === "report") {
          setLiveReport(event.report);
        } else if (event.type === "error") {
          toast.error(event.message);
        } else if (event.type === "done") {
          toast.success("Research complete — report saved to the knowledge base");
          router.refresh();
        }
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Research failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[7fr_5fr]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {company.last_researched_at
              ? `Last researched ${formatDateTime(company.last_researched_at)}`
              : "Not researched yet — the agent reads their website and recent news."}
          </p>
          <Button onClick={startResearch} disabled={running}>
            <Sparkles className="size-4" />
            {running
              ? "Researching…"
              : report
                ? "Research again"
                : "Research company"}
          </Button>
        </div>

        {running && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Search className="size-4 animate-pulse text-ai" aria-hidden />
                Agent at work
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5" aria-live="polite">
                {feed.map((item, i) => (
                  <Badge
                    key={i}
                    variant={item.kind === "status" ? "secondary" : "outline"}
                  >
                    {item.text}
                  </Badge>
                ))}
              </div>
              {narration && (
                <p className="border-l-2 border-ai/40 pl-3 text-sm whitespace-pre-wrap text-muted-foreground">
                  {narration}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {report ? (
          <ReportView report={report} />
        ) : (
          !running && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
              <div className="flex size-10 items-center justify-center rounded-lg bg-ai/10">
                <Sparkles className="size-5 text-ai" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-medium">No research yet</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  The agent crawls the website, searches recent news and produces
                  pain points, automation opportunities and outreach angles —
                  everything lands in the knowledge base below.
                </p>
              </div>
              <Button onClick={startResearch} variant="outline" size="sm">
                <Sparkles className="size-4 text-ai" />
                Start research
              </Button>
            </div>
          )
        )}

        <Separator />

        <KnowledgeSection company={company} documents={documents} />
      </div>

      <ChatPanel
        companyId={company.id}
        initialConversationId={initialConversationId}
        initialMessages={initialMessages}
        className="xl:sticky xl:top-6"
      />
    </div>
  );
}

function ReportView({ report }: { report: ResearchReport }) {
  const sections = [
    { title: "Pain points", icon: Target, items: report.pain_points },
    {
      title: "Automation opportunities",
      icon: Wrench,
      items: report.automation_opportunities,
    },
    { title: "Suggested services", icon: Lightbulb, items: report.suggested_services },
    { title: "Icebreakers", icon: Sparkles, items: report.icebreakers },
    { title: "Recent news", icon: Newspaper, items: report.recent_news },
    { title: "Tech stack", icon: Cpu, items: report.tech_stack },
  ];

  return (
    <div className="space-y-3">
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm">Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="max-w-prose">{report.summary}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="secondary">{report.industry}</Badge>
            <Badge variant="outline">{report.estimated_size}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card size="sm" className="bg-ai/5 ring-ai/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Target className="size-4 text-ai" aria-hidden />
            Recommended outreach angle
          </CardTitle>
        </CardHeader>
        <CardContent className="max-w-prose text-sm">
          {report.recommended_outreach_angle}
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {sections
          .filter((s) => s.items.length > 0)
          .map((section) => (
            <Card key={section.title} size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <section.icon className="size-4 text-muted-foreground" aria-hidden />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1.5 pl-4 text-sm">
                  {section.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
