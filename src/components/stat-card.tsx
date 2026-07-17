import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Restrained KPI tile: label, tabular value, optional trend + context line.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  delta,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  delta?: { label: string; direction: "up" | "down" | "flat" };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl bg-card p-4 ring-1 ring-foreground/10",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        {Icon ? <Icon className="size-4 text-muted-foreground/70" aria-hidden /> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {(delta || hint) && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          {delta ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                delta.direction === "up" && "text-success",
                delta.direction === "down" && "text-destructive"
              )}
            >
              {delta.direction === "up" ? (
                <TrendingUp className="size-3" aria-hidden />
              ) : delta.direction === "down" ? (
                <TrendingDown className="size-3" aria-hidden />
              ) : null}
              {delta.label}
            </span>
          ) : null}
          {hint}
        </p>
      )}
    </div>
  );
}
