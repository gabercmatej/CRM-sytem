import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlarmClock,
  Banknote,
  Building2,
  CheckCircle2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { getAuthContext } from "@/lib/supabase/server";
import { formatDateTime, formatMoney } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  const { supabase } = auth;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

  const [
    { data: openDeals },
    { data: wonDeals },
    { count: companyCount },
    { count: weekActivityCount },
    { data: followUps },
    { data: recentRuns },
  ] = await Promise.all([
    supabase
      .from("deals")
      .select("value")
      .not("stage", "in", "(won,lost)"),
    supabase
      .from("deals")
      .select("value")
      .eq("stage", "won")
      .gte("updated_at", thirtyDaysAgo),
    supabase.from("companies").select("*", { count: "exact", head: true }),
    supabase
      .from("activities")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    supabase
      .from("activities")
      .select("id, subject, due_at, company_id, companies(name)")
      .not("due_at", "is", null)
      .is("completed_at", null)
      .order("due_at")
      .limit(8),
    supabase
      .from("research_runs")
      .select("id, status, created_at, company_id, companies(name)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const pipelineValue = (openDeals ?? []).reduce((s, d) => s + (d.value ?? 0), 0);
  const wonValue = (wonDeals ?? []).reduce((s, d) => s + (d.value ?? 0), 0);

  const stats = [
    {
      label: "Open pipeline",
      value: formatMoney(pipelineValue),
      icon: TrendingUp,
    },
    { label: "Won (30 days)", value: formatMoney(wonValue), icon: Banknote },
    { label: "Companies", value: String(companyCount ?? 0), icon: Building2 },
    {
      label: "Activities this week",
      value: String(weekActivityCount ?? 0),
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 pt-0">
              <div className="rounded-lg bg-muted p-2.5">
                <s.icon className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xl font-semibold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlarmClock className="size-4" /> Upcoming follow-ups
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(followUps ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nothing due. Log a task with a due date on a company to see it here.
              </p>
            )}
            {(followUps ?? []).map((task) => {
              const overdue = task.due_at && new Date(task.due_at) < new Date();
              return (
                <Link
                  key={task.id}
                  href={`/companies/${task.company_id}`}
                  className="flex items-center justify-between gap-2 rounded-md border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{task.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {(task.companies as unknown as { name: string } | null)?.name}
                    </p>
                  </div>
                  <Badge variant={overdue ? "destructive" : "secondary"}>
                    {formatDateTime(task.due_at)}
                  </Badge>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4" /> Recent AI research
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(recentRuns ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">
                No research yet. Open a company and hit “Research company”.
              </p>
            )}
            {(recentRuns ?? []).map((run) => (
              <Link
                key={run.id}
                href={`/companies/${run.company_id}`}
                className="flex items-center justify-between gap-2 rounded-md border p-3 transition-colors hover:bg-muted/50"
              >
                <p className="truncate text-sm font-medium">
                  {(run.companies as unknown as { name: string } | null)?.name}
                </p>
                <Badge
                  variant={run.status === "completed" ? "secondary" : "outline"}
                  className="capitalize"
                >
                  {run.status}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
