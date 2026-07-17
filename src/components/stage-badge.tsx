import type { DealStage } from "@/lib/database.types";
import { STAGE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Literal class maps so Tailwind can see every stage utility at build time
 * (dynamic `bg-${...}` strings are invisible to the scanner).
 */
export const STAGE_DOT_CLASS: Record<DealStage, string> = {
  new: "bg-stage-new",
  researching: "bg-stage-researching",
  contacted: "bg-stage-contacted",
  meeting_booked: "bg-stage-discovery",
  proposal_sent: "bg-stage-proposal",
  negotiating: "bg-stage-negotiation",
  won: "bg-stage-won",
  lost: "bg-stage-lost",
};

export const STAGE_TEXT_CLASS: Record<DealStage, string> = {
  new: "text-stage-new",
  researching: "text-stage-researching",
  contacted: "text-stage-contacted",
  meeting_booked: "text-stage-discovery",
  proposal_sent: "text-stage-proposal",
  negotiating: "text-stage-negotiation",
  won: "text-stage-won",
  lost: "text-stage-lost",
};

export function StageDot({
  stage,
  className,
}: {
  stage: DealStage;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("size-2 shrink-0 rounded-full", STAGE_DOT_CLASS[stage], className)}
    />
  );
}

export function StageBadge({
  stage,
  className,
}: {
  stage: DealStage;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-background px-2 py-0.5 text-xs font-medium whitespace-nowrap text-foreground/80",
        className
      )}
    >
      <StageDot stage={stage} />
      {STAGE_LABELS[stage]}
    </span>
  );
}
