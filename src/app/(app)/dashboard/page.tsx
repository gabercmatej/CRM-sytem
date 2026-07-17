import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  Building2,
  ChartNoAxesColumn,
  Check,
  Inbox,
  Send,
  Sparkles,
  Telescope,
} from "lucide-react";
import { getAuthContext } from "@/lib/supabase/server";
import { getWorkspaceSettings } from "@/lib/workspace-settings";
import {
  OPEN_STAGES,
  PIPELINE_STAGES,
  formatDate,
  formatMoney,
  formatRelative,
  researchCostUsd,
} from "@/lib/constants";
import type { DealStage } from "@/lib/database.types";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StageBadge, STAGE_DOT_CLASS } from "@/components/stage-badge";
import { ActivityIcon } from "@/components/activity-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { NewCompanyDialog } from "../companies/new-company-dialog";
import { completeTask } from "../companies/actions";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

function timeWindows() {
  const now = Date.now();
  return {
    d30: new Date(now - 30 * 86400_000).toISOString(),
    nowIso: new Date(now).toISOString(),
  };
}

export default async function DashboardPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  const { supabase } = auth;

  const { d30, nowIso } = timeWindows();

  const [companiesRes, dealsRes, activitiesRes, runsRes, userRes] =
    await Promise.all([
      supabase
        .from("companies")
        .select("id, name, stage, industry, created_at, last_researched_at")
        .order("created_at", { ascending: false }),
      supabase.from("deals").select("company_id, value, stage, updated_at"),
      supabase
        .from("activities")
        .select("id, type, subject, company_id, created_at, due_at, completed_at")
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("research_runs")
        .select("input_tokens, output_tokens, status, created_at"),
      supabase.auth.getUser(),
    ]);
  const settings = await getWorkspaceSettings(supabase, auth.workspaceId);
  const currency = settings.currency;

  const user = userRes.data.user;
  // Prefer the name saved in Settings; otherwise fall back to the first
  // name-like token of the email local part ("matej.gaberc2004" → "Matej").
  const emailToken =
    (user?.email?.split("@")[0] ?? "").split(/[.\-_+0-9]+/).filter(Boolean)[0] ??
    "there";
  const displayName =
    (user?.user_metadata?.display_name as string | undefined)?.trim() ||
    emailToken.charAt(0).toUpperCase() + emailToken.slice(1);

  const companies = companiesRes.data ?? [];
  const deals = dealsRes.data ?? [];
  const activities = activitiesRes.data ?? [];
  const runs = runsRes.data ?? [];
  const companyName = new Map(companies.map((c) => [c.id, c.name]));

  // Money — company-centric, matching the pipeline board: a company's value is
  // the sum of its non-lost deals, then bucketed by the company's own stage.
  const companyValue = new Map<string, number>();
  for (const d of deals) {
    if (d.stage === "lost") continue;
    companyValue.set(
      d.company_id,
      (companyValue.get(d.company_id) ?? 0) + (d.value ?? 0)
    );
  }
  const openValue = companies
    .filter((c) => OPEN_STAGES.includes(c.stage))
    .reduce((s, c) => s + (companyValue.get(c.id) ?? 0), 0);
  const wonValue = companies
    .filter((c) => c.stage === "won")
    .reduce((s, c) => s + (companyValue.get(c.id) ?? 0), 0);
  const wonCount = companies.filter((c) => c.stage === "won").length;

  // Outreach + AI (last 30 days)
  const emailsSent30 = activities.filter(
    (a) => (a.type === "email" || a.type === "ai_email") && a.created_at >= d30
  ).length;
  const meetings30 = activities.filter(
    (a) => a.type === "meeting" && a.created_at >= d30
  ).length;
  const runs30 = runs.filter((r) => r.created_at >= d30);
  const spend30 = runs30.reduce(
    (s, r) => s + researchCostUsd(r.input_tokens, r.output_tokens),
    0
  );
  const companiesAdded30 = companies.filter((c) => c.created_at >= d30).length;

  // Attention: open follow-ups sorted by due date
  const followUps = activities
    .filter((a) => a.due_at && !a.completed_at)
    .sort((a, b) => (a.due_at! < b.due_at! ? -1 : 1))
    .slice(0, 6);

  // Pipeline distribution (companies per stage)
  const stageCount = new Map<DealStage, number>();
  for (const c of companies)
    stageCount.set(c.stage, (stageCount.get(c.stage) ?? 0) + 1);
  const openCompanies = companies.filter((c) =>
    OPEN_STAGES.includes(c.stage)
  ).length;

  const recentActivity = activities.slice(0, 8);
  const recentCompanies = companies.slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title={`Hello, ${displayName}`}
        description="What needs your attention, and how outreach is progressing."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open pipeline"
          value={formatMoney(openValue, currency)}
          icon={Banknote}
          hint={`across ${openCompanies} active ${openCompanies === 1 ? "company" : "companies"}`}
        />
        <StatCard
          label="Won"
          value={formatMoney(wonValue, currency)}
          icon={Check}
          hint={
            wonCount > 0
              ? `${wonCount} ${wonCount === 1 ? "company" : "companies"} closed`
              : "no closed deals yet"
          }
        />
        <StatCard
          label="Companies"
          value={companies.length}
          icon={Building2}
          delta={
            companiesAdded30 > 0
              ? { label: `+${companiesAdded30}`, direction: "up" }
              : undefined
          }
          hint="in the last 30 days"
        />
        <StatCard
          label="Outreach · 30 days"
          value={emailsSent30}
          icon={Send}
          hint={`emails sent · ${meetings30} ${meetings30 === 1 ? "meeting" : "meetings"} booked`}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pipeline</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" render={<Link href="/pipeline" />}>
                Open board
                <ArrowRight className="size-3.5" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            {companies.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No companies yet — add one to see your pipeline take shape.
              </p>
            ) : (
              <>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  {PIPELINE_STAGES.map((s) => {
                    const count = stageCount.get(s.value) ?? 0;
                    if (count === 0) return null;
                    return (
                      <div
                        key={s.value}
                        className={STAGE_DOT_CLASS[s.value]}
                        style={{ width: `${(count / companies.length) * 100}%` }}
                        title={`${s.label}: ${count}`}
                      />
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                  {PIPELINE_STAGES.map((s) => (
                    <Link
                      key={s.value}
                      href="/pipeline"
                      className="group flex items-center gap-2 text-sm"
                    >
                      <span
                        className={cn("size-2 shrink-0 rounded-full", STAGE_DOT_CLASS[s.value])}
                        aria-hidden
                      />
                      <span className="truncate text-muted-foreground group-hover:text-foreground">
                        {s.label}
                      </span>
                      <span className="ml-auto font-medium tabular-nums">
                        {stageCount.get(s.value) ?? 0}
                      </span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <NewCompanyDialog
              trigger={
                <Button variant="outline" className="justify-start">
                  <Building2 className="size-4 text-muted-foreground" />
                  New company
                </Button>
              }
            />
            <Button
              variant="outline"
              className="justify-start"
              render={<Link href="/leads" />}
            >
              <Telescope className="size-4 text-muted-foreground" />
              Find new leads
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              render={<Link href="/analytics" />}
            >
              <ChartNoAxesColumn className="size-4 text-muted-foreground" />
              View analytics
            </Button>
            <div className="mt-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <Sparkles className="size-3.5 text-ai" aria-hidden />
                AI this month
              </p>
              <p className="mt-1">
                {runs30.length} research {runs30.length === 1 ? "run" : "runs"} ·{" "}
                {formatMoney(spend30, "USD")} spent
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Follow-ups due</CardTitle>
          </CardHeader>
          <CardContent>
            {followUps.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nothing due — log a task or send an email to stay in motion.
              </p>
            ) : (
              <ul className="space-y-1">
                {followUps.map((task) => {
                  const overdue = task.due_at! < nowIso;
                  return (
                    <li
                      key={task.id}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
                    >
                      <form
                        action={completeTask.bind(null, task.id, task.company_id)}
                      >
                        <Button
                          variant="outline"
                          size="icon-xs"
                          type="submit"
                          className="rounded-full"
                          aria-label={`Complete “${task.subject}”`}
                        >
                          <Check className="size-3" />
                        </Button>
                      </form>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/companies/${task.company_id}`}
                          className="block truncate text-sm font-medium hover:underline"
                        >
                          {task.subject}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {companyName.get(task.company_id) ?? "—"}
                        </p>
                      </div>
                      <Badge
                        variant={overdue ? "destructive" : "secondary"}
                        className="shrink-0"
                      >
                        {overdue ? "Overdue" : formatDate(task.due_at)}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recently added</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" render={<Link href="/companies" />}>
                All companies
                <ArrowRight className="size-3.5" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {recentCompanies.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Companies you add will appear here.
              </p>
            ) : (
              <ul className="space-y-1">
                {recentCompanies.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/companies/${c.id}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                        {c.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.industry ?? "—"} · added {formatRelative(c.created_at)}
                        </p>
                      </div>
                      <StageBadge stage={c.stage} className="shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Inbox className="size-5 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">
                Research a company or log a call to start your timeline.
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {recentActivity.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
                >
                  <ActivityIcon type={a.type} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{a.subject}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {companyName.get(a.company_id) ?? "—"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelative(a.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
