"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Lightbulb,
  Newspaper,
  Search,
  Sparkles,
  Target,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import type { Company, ResearchReport, ResearchRun } from "@/lib/database.types";
import { formatDateTime } from "@/lib/constants";
import { readSseStream } from "@/lib/sse";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export function ResearchTab({
  company,
  runs,
}: {
  company: Company;
  runs: ResearchRun[];
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
          toast.success("Research complete");
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {company.last_researched_at
              ? `Last researched ${formatDateTime(company.last_researched_at)}`
              : "This company hasn't been researched yet."}
          </p>
        </div>
        <Button onClick={startResearch} disabled={running}>
          <Sparkles className="size-4" />
          {running ? "Researching…" : "Research company"}
        </Button>
      </div>

      {running && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="size-4 animate-pulse" /> Agent at work
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
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
              <p className="whitespace-pre-wrap border-l-2 pl-3 text-sm text-muted-foreground">
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
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-background py-16 text-center">
            <Sparkles className="size-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No research yet</p>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                The agent reads the company&apos;s website, searches recent news and
                produces pain points, automation opportunities and outreach angles.
              </p>
            </div>
          </div>
        )
      )}
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
    { title: "Tech stack", icon: Globe, items: report.tech_stack },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>{report.summary}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="secondary">{report.industry}</Badge>
            <Badge variant="outline">{report.estimated_size}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="size-4" /> Recommended outreach angle
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {report.recommended_outreach_angle}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {sections
          .filter((s) => s.items.length > 0)
          .map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <section.icon className="size-4" /> {section.title}
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
