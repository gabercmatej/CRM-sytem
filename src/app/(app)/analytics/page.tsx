import { redirect } from "next/navigation";
import { Banknote, ChartNoAxesColumn, Percent, Sparkles, Trophy } from "lucide-react";
import { getAuthContext } from "@/lib/supabase/server";
import { getWorkspaceSettings } from "@/lib/workspace-settings";
import {
  OPEN_STAGES,
  PIPELINE_STAGES,
  STAGE_ORDER,
  formatMoney,
  researchCostUsd,
} from "@/lib/constants";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import {
  ChartCard,
  ColumnChart,
  FunnelChart,
  HorizontalBars,
  TrendChart,
  WonLostChart,
} from "./charts";

export const metadata = { title: "Analytics" };

/** Fixed-order categorical palette (validated in globals.css) for by-category bars. */
const CHART_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function monthKeys(count: number) {
  const out: { key: string; label: string }[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = count - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push({
      key: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`,
      label: m.toLocaleDateString("en", { month: "short" }),
    });
  }
  return out;
}

const keyOf = (iso: string) => iso.slice(0, 7);
const quarterOf = (iso: string) => {
  const d = new Date(iso);
  return `Q${Math.floor(d.getMonth() / 3) + 1} ${String(d.getFullYear()).slice(2)}`;
};

export default async function AnalyticsPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  const { supabase } = auth;

  const [companiesRes, dealsRes, runsRes, proposalsRes, leadsRes, settings] =
    await Promise.all([
      supabase.from("companies").select("id, industry, stage, created_at"),
      supabase.from("deals").select("company_id, value, stage, updated_at, created_at"),
      supabase.from("research_runs").select("input_tokens, output_tokens, created_at"),
      supabase.from("proposals").select("id, status"),
      supabase.from("leads").select("id, status"),
      getWorkspaceSettings(supabase, auth.workspaceId),
    ]);
  const currency = settings.currency;

  const companies = companiesRes.data ?? [];
  const deals = dealsRes.data ?? [];
  const runs = runsRes.data ?? [];
  const proposals = proposalsRes.data ?? [];
  const leads = leadsRes.data ?? [];

  if (companies.length === 0) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <PageHeader
          title="Analytics"
          description="Revenue, conversion and cost insights across your pipeline."
        />
        <EmptyState
          icon={ChartNoAxesColumn}
          title="No data to chart yet"
          description="Analytics lights up once companies and deals are in the pipeline. Add a company — or load demo data from Settings — to see it in action."
        />
      </div>
    );
  }

  const months = monthKeys(12);
  const wonDeals = deals.filter((d) => d.stage === "won");
  const lostDeals = deals.filter((d) => d.stage === "lost");
  const industryOf = new Map(companies.map((c) => [c.id, c.industry ?? "Other"]));

  // Revenue by month / quarter (won deals, by close date ≈ updated_at)
  const revenueByMonth = months.map((m) => ({
    label: m.label,
    value: wonDeals
      .filter((d) => keyOf(d.updated_at) === m.key)
      .reduce((s, d) => s + (d.value ?? 0), 0),
  }));

  const quarters: { label: string; value: number }[] = [];
  for (const d of wonDeals) {
    const q = quarterOf(d.updated_at);
    const found = quarters.find((x) => x.label === q);
    if (found) found.value += d.value ?? 0;
    else quarters.push({ label: q, value: d.value ?? 0 });
  }
  const revenueByQuarter = quarters.slice(-4);

  // Won vs lost per month (deal counts)
  const wonLost = months.map((m) => ({
    label: m.label,
    won: wonDeals.filter((d) => keyOf(d.updated_at) === m.key).length,
    lost: lostDeals.filter((d) => keyOf(d.updated_at) === m.key).length,
  }));

  // Revenue by industry (won; falls back to pipeline value when nothing won)
  const industryRevenue = new Map<string, number>();
  const industrySource = wonDeals.length > 0 ? wonDeals : deals.filter((d) => d.stage !== "lost");
  for (const d of industrySource) {
    const ind = industryOf.get(d.company_id) ?? "Other";
    industryRevenue.set(ind, (industryRevenue.get(ind) ?? 0) + (d.value ?? 0));
  }
  const byIndustry = [...industryRevenue.entries()]
    .map(([label, value]) => ({ label, value }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, CHART_PALETTE.length);

  // Funnel: companies that reached at least each stage (current-stage approximation)
  const funnelStages = PIPELINE_STAGES.filter((s) => s.value !== "lost");
  const notLost = companies.filter((c) => c.stage !== "lost");
  const reached = funnelStages.map((s) => ({
    stage: s,
    count: notLost.filter((c) => STAGE_ORDER[c.stage] >= STAGE_ORDER[s.value]).length,
  }));
  const funnel = reached.map((r, i) => ({
    label: r.stage.label,
    value: r.count,
    conversion:
      i === 0 || reached[0].count === 0
        ? null
        : Math.round((r.count / reached[0].count) * 100),
  }));

  // Growth: cumulative companies by month
  const growth = months.map((m) => ({
    label: m.label,
    value: companies.filter((c) => keyOf(c.created_at) <= m.key).length,
  }));

  // Research costs by month + totals
  const costByMonth = months.map((m) => ({
    label: m.label,
    value:
      Math.round(
        runs
          .filter((r) => keyOf(r.created_at) === m.key)
          .reduce((s, r) => s + researchCostUsd(r.input_tokens, r.output_tokens), 0) * 100
      ) / 100,
  }));
  const totalSpend = runs.reduce(
    (s, r) => s + researchCostUsd(r.input_tokens, r.output_tokens),
    0
  );

  // Headline stats
  const openValue = deals
    .filter((d) => d.stage !== "won" && d.stage !== "lost")
    .reduce((s, d) => s + (d.value ?? 0), 0);
  const wonValue = wonDeals.reduce((s, d) => s + (d.value ?? 0), 0);
  const decided = wonDeals.length + lostDeals.length;
  const winRate = decided > 0 ? Math.round((wonDeals.length / decided) * 100) : null;
  const avgDeal =
    wonDeals.length > 0
      ? wonValue / wonDeals.length
      : deals.length > 0
        ? deals.reduce((s, d) => s + (d.value ?? 0), 0) / deals.length
        : 0;
  const roi = totalSpend > 0 ? wonValue / totalSpend : null;

  const proposalsSent = proposals.filter((p) => p.status !== "draft").length;
  const proposalsAccepted = proposals.filter((p) => p.status === "accepted").length;
  const leadsAdded = leads.filter((l) => l.status === "added").length;
  const costPerLead =
    totalSpend > 0 && leadsAdded > 0 ? totalSpend / leadsAdded : null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Analytics"
        description="Revenue, conversion and cost insights across your pipeline."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open pipeline"
          value={formatMoney(openValue, currency)}
          icon={Banknote}
          hint={`${companies.filter((c) => OPEN_STAGES.includes(c.stage)).length} active companies`}
        />
        <StatCard
          label="Revenue won"
          value={formatMoney(wonValue, currency)}
          icon={Trophy}
          hint={`${wonDeals.length} deals closed`}
        />
        <StatCard
          label="Win rate"
          value={winRate == null ? "—" : `${winRate}%`}
          icon={Percent}
          hint={
            decided > 0
              ? `${wonDeals.length} won · ${lostDeals.length} lost`
              : "no decided deals yet"
          }
        />
        <StatCard
          label="Research ROI"
          value={roi == null ? "—" : `${Math.round(roi)}×`}
          icon={Sparkles}
          hint={
            totalSpend > 0
              ? `${formatMoney(totalSpend, "USD")} spent on research`
              : "no research runs yet"
          }
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <ChartCard
          title="Revenue by month"
          description="Closed-won deal value, last 12 months"
          className="lg:col-span-2"
          columns={["Month", "Revenue"]}
          rows={revenueByMonth.map((r) => [r.label, formatMoney(r.value, currency)])}
        >
          <ColumnChart
            data={revenueByMonth}
            kind="money"
            currency={currency}
            color="var(--success)"
          />
        </ChartCard>
        <ChartCard
          title="Revenue by quarter"
          columns={["Quarter", "Revenue"]}
          rows={revenueByQuarter.map((r) => [r.label, formatMoney(r.value, currency)])}
        >
          {revenueByQuarter.length > 0 ? (
            <ColumnChart
              data={revenueByQuarter}
              kind="money"
              currency={currency}
              color="var(--success)"
            />
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No closed-won deals yet.
            </p>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard
          title="Won vs lost"
          description="Deal outcomes per month"
          columns={["Month", "Won", "Lost"]}
          rows={wonLost.map((r) => [r.label, r.won, r.lost])}
        >
          <WonLostChart data={wonLost} />
        </ChartCard>
        <ChartCard
          title={wonDeals.length > 0 ? "Revenue by industry" : "Pipeline by industry"}
          description={wonDeals.length > 0 ? "Closed-won value" : "Open deal value"}
          columns={["Industry", "Value"]}
          rows={byIndustry.map((r) => [r.label, formatMoney(r.value, currency)])}
        >
          {byIndustry.length > 0 ? (
            <HorizontalBars
              data={byIndustry}
              kind="money"
              currency={currency}
              colors={CHART_PALETTE}
            />
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Add deal values to see industry breakdowns.
            </p>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard
          title="Conversion funnel"
          description="Companies reaching each stage, with conversion from the top"
          columns={["Stage", "Companies", "Conversion"]}
          rows={funnel.map((r) => [
            r.label,
            r.value,
            r.conversion == null ? "—" : `${r.conversion}%`,
          ])}
        >
          <FunnelChart data={funnel} />
        </ChartCard>
        <ChartCard
          title="Company growth"
          description="Total companies in the workspace over time"
          columns={["Month", "Companies"]}
          rows={growth.map((r) => [r.label, r.value])}
        >
          <TrendChart data={growth} />
        </ChartCard>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <ChartCard
          title="Research spend"
          description="Estimated AI research cost per month (USD)"
          className="lg:col-span-2"
          columns={["Month", "Spend"]}
          rows={costByMonth.map((r) => [r.label, formatMoney(r.value, "USD")])}
        >
          <ColumnChart data={costByMonth} kind="usd" color="var(--chart-3)" />
        </ChartCard>
        <div className="flex flex-col gap-3">
          <StatCard
            label="Average deal size"
            value={avgDeal > 0 ? formatMoney(avgDeal, currency) : "—"}
            hint={wonDeals.length > 0 ? "based on won deals" : "based on all deals"}
          />
          <StatCard
            label="Proposal success"
            value={
              proposalsSent > 0
                ? `${Math.round((proposalsAccepted / proposalsSent) * 100)}%`
                : "—"
            }
            hint={
              proposalsSent > 0
                ? `${proposalsAccepted} accepted of ${proposalsSent} sent`
                : "no proposals sent yet"
            }
          />
          <StatCard
            label="Cost per acquired lead"
            value={costPerLead == null ? "—" : formatMoney(costPerLead, "USD")}
            hint={
              leadsAdded > 0
                ? `${leadsAdded} leads added from discovery`
                : "add leads from Find Leads"
            }
          />
        </div>
      </div>
    </div>
  );
}
