import type { ActivityType, DealStage } from "@/lib/database.types";

/**
 * Pipeline stages apply to companies (every company lives on the board) and
 * to individual deals. Colors are design tokens defined in globals.css
 * (`--color-stage-*`), so `bg-stage-new`, `text-stage-won`, etc. all work.
 */
export const PIPELINE_STAGES: {
  value: DealStage;
  label: string;
  color: string;
  description: string;
}[] = [
  { value: "new", label: "New", color: "stage-new", description: "Just added, not yet worked" },
  { value: "researching", label: "Researching", color: "stage-researching", description: "Gathering intelligence" },
  { value: "contacted", label: "Contacted", color: "stage-contacted", description: "First outreach sent" },
  { value: "meeting_booked", label: "Discovery", color: "stage-discovery", description: "In conversation" },
  { value: "proposal_sent", label: "Proposal sent", color: "stage-proposal", description: "Waiting on a decision" },
  { value: "negotiating", label: "Negotiation", color: "stage-negotiation", description: "Terms being agreed" },
  { value: "won", label: "Won", color: "stage-won", description: "Closed won" },
  { value: "lost", label: "Lost", color: "stage-lost", description: "Closed lost" },
];

export const STAGE_LABELS = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.value, s.label])
) as Record<DealStage, string>;

/** Ordinal position of each stage, for sorting and funnel math. */
export const STAGE_ORDER = Object.fromEntries(
  PIPELINE_STAGES.map((s, i) => [s.value, i])
) as Record<DealStage, number>;

export const OPEN_STAGES: DealStage[] = [
  "new",
  "researching",
  "contacted",
  "meeting_booked",
  "proposal_sent",
  "negotiating",
];

export const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "email", label: "Email" },
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
  { value: "task", label: "Task / follow-up" },
];

/** Claude Opus 4.8 pricing (USD per million tokens) — used for research cost estimates. */
export const AI_PRICING = { inputPerM: 5, outputPerM: 25 };

export function researchCostUsd(inputTokens: number, outputTokens: number) {
  return (
    (inputTokens / 1_000_000) * AI_PRICING.inputPerM +
    (outputTokens / 1_000_000) * AI_PRICING.outputPerM
  );
}

export function formatMoney(
  value: number | null,
  currency = "EUR",
  options: { compact?: boolean } = {}
) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    ...(options.compact && Math.abs(value) >= 10_000
      ? { notation: "compact" as const, maximumFractionDigits: 1 }
      : {}),
  }).format(value);
}

export function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(iso)
  );
}

export function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

/** "3d ago" / "2h ago" style relative time for activity feeds. */
export function formatRelative(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}
