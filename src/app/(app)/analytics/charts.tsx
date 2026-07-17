"use client";

import { useId, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Table2, ChartNoAxesColumn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/* ---------- shared formatting ---------- */

const num = (v: number) => new Intl.NumberFormat("en").format(v);

export type ValueKind = "money" | "usd" | "number" | "percent";

function formatValue(kind: ValueKind, v: number, currency: string) {
  switch (kind) {
    case "money":
      return new Intl.NumberFormat("en", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
        ...(Math.abs(v) >= 10_000 ? { notation: "compact" as const } : {}),
      }).format(v);
    case "usd":
      return new Intl.NumberFormat("en", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: v < 100 ? 2 : 0,
      }).format(v);
    case "percent":
      return `${Math.round(v)}%`;
    default:
      return num(v);
  }
}

const AXIS_TICK = { fontSize: 11, fill: "var(--muted-foreground)" };

function ChartTooltip({
  active,
  payload,
  label,
  kind,
  currency = "EUR",
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string }[];
  label?: string | number;
  kind: ValueKind;
  currency?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md">
      {label != null && <p className="mb-0.5 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5">
          {p.color ? (
            <span
              className="size-2 rounded-full"
              style={{ background: p.color }}
              aria-hidden
            />
          ) : null}
          {p.name ? <span className="text-muted-foreground">{p.name}</span> : null}
          <span className="ml-auto pl-3 font-medium tabular-nums">
            {formatValue(kind, Math.abs(Number(p.value ?? 0)), currency)}
          </span>
        </p>
      ))}
    </div>
  );
}

/* ---------- chart card with table-view twin ---------- */

export function ChartCard({
  title,
  description,
  columns,
  rows,
  children,
  className,
}: {
  title: string;
  description?: string;
  /** Table twin — every chart value must be reachable without color/hover. */
  columns: string[];
  rows: (string | number)[][];
  children: React.ReactNode;
  className?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  const titleId = useId();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle id={titleId}>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowTable((v) => !v)}
            aria-label={showTable ? "Show chart" : "Show data table"}
            aria-pressed={showTable}
          >
            {showTable ? (
              <ChartNoAxesColumn className="size-4" />
            ) : (
              <Table2 className="size-4" />
            )}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {showTable ? (
          <div className="max-h-64 overflow-y-auto rounded-lg border">
            <Table aria-labelledby={titleId}>
              <TableHeader>
                <TableRow>
                  {columns.map((c) => (
                    <TableHead key={c}>{c}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    {r.map((cell, j) => (
                      <TableCell
                        key={j}
                        className={j > 0 ? "tabular-nums" : undefined}
                      >
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- simple column chart (single series) ---------- */

export function ColumnChart({
  data,
  color = "var(--chart-1)",
  kind = "money",
  currency = "EUR",
  height = 240,
}: {
  data: { label: string; value: number }[];
  color?: string;
  kind?: ValueKind;
  currency?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} barCategoryGap="25%">
        <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={44}
          tickFormatter={(v: number) => formatValue(kind, v, currency)}
        />
        <Tooltip
          cursor={{ fill: "var(--accent)", opacity: 0.5 }}
          content={<ChartTooltip kind={kind} currency={currency} />}
        />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={24} name="Value" />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- diverging won vs lost ---------- */

export function WonLostChart({
  data,
  height = 240,
}: {
  data: { label: string; won: number; lost: number }[];
  height?: number;
}) {
  const plotted = data.map((d) => ({ ...d, lost: -d.lost }));
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={plotted}
          stackOffset="sign"
          margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
          barCategoryGap="25%"
        >
          <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={30}
            tickFormatter={(v: number) => num(Math.abs(v))}
          />
          <Tooltip
            cursor={{ fill: "var(--accent)", opacity: 0.5 }}
            content={<ChartTooltip kind="number" />}
          />
          <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />
          <Bar
            dataKey="won"
            stackId="wl"
            fill="var(--stage-won)"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            name="Won"
          />
          <Bar
            dataKey="lost"
            stackId="wl"
            fill="var(--chart-1)"
            radius={[0, 0, 4, 4]}
            maxBarSize={24}
            name="Lost"
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-stage-won" aria-hidden /> Won
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-chart-1" aria-hidden /> Lost
        </span>
      </div>
    </div>
  );
}

/* ---------- horizontal bars (nominal categories, one hue) ---------- */

export function HorizontalBars({
  data,
  color = "var(--chart-1)",
  colors,
  kind = "money",
  currency = "EUR",
}: {
  data: { label: string; value: number }[];
  color?: string;
  /** Per-bar categorical colors, assigned in fixed order (no cycling). */
  colors?: string[];
  kind?: ValueKind;
  currency?: string;
}) {
  const height = Math.max(140, data.length * 36 + 24);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 48, bottom: 0, left: 8 }}
      >
        <CartesianGrid horizontal={false} stroke="var(--border)" strokeWidth={1} />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ ...AXIS_TICK, fill: "var(--foreground)" }}
          axisLine={false}
          tickLine={false}
          width={130}
        />
        <Tooltip
          cursor={{ fill: "var(--accent)", opacity: 0.5 }}
          content={<ChartTooltip kind={kind} currency={currency} />}
        />
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} maxBarSize={16} name="Value">
          {colors
            ? data.map((_, i) => (
                <Cell key={i} fill={colors[i] ?? "var(--muted-foreground)"} />
              ))
            : null}
          <LabelList
            dataKey="value"
            position="right"
            formatter={(v) => formatValue(kind, Number(v), currency)}
            style={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- pipeline funnel (ordinal single-hue ramp via opacity) ---------- */

export function FunnelChart({
  data,
}: {
  data: { label: string; value: number; conversion: number | null }[];
}) {
  const height = Math.max(150, data.length * 38 + 24);
  const n = data.length;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 72, bottom: 0, left: 8 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ ...AXIS_TICK, fill: "var(--foreground)" }}
          axisLine={false}
          tickLine={false}
          width={110}
        />
        <Tooltip
          cursor={{ fill: "var(--accent)", opacity: 0.5 }}
          content={<ChartTooltip kind="number" />}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18} name="Companies">
          {data.map((_, i) => (
            <Cell
              key={i}
              fill="var(--chart-1)"
              fillOpacity={0.45 + (0.55 * i) / Math.max(1, n - 1)}
            />
          ))}
          <LabelList
            dataKey="conversion"
            position="right"
            formatter={(v) => (v == null ? "" : `${v}%`)}
            style={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- growth trend (single-series area) ---------- */

export function TrendChart({
  data,
  color = "var(--chart-4)",
  kind = "number",
  height = 240,
}: {
  data: { label: string; value: number }[];
  color?: string;
  kind?: ValueKind;
  height?: number;
}) {
  const gradId = useId();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.14} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={34}
          allowDecimals={false}
        />
        <Tooltip content={<ChartTooltip kind={kind} />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradId})`}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          name="Value"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
