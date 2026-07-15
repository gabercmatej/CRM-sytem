import type { ActivityType, DealStage } from "@/lib/database.types";

export const DEAL_STAGES: { value: DealStage; label: string; color: string }[] = [
  { value: "new", label: "New", color: "bg-slate-500" },
  { value: "researching", label: "Researching", color: "bg-violet-500" },
  { value: "contacted", label: "Contacted", color: "bg-blue-500" },
  { value: "meeting_booked", label: "Meeting booked", color: "bg-cyan-500" },
  { value: "proposal_sent", label: "Proposal sent", color: "bg-amber-500" },
  { value: "negotiating", label: "Negotiating", color: "bg-orange-500" },
  { value: "won", label: "Won", color: "bg-emerald-500" },
  { value: "lost", label: "Lost", color: "bg-rose-500" },
];

export const STAGE_LABELS = Object.fromEntries(
  DEAL_STAGES.map((s) => [s.value, s.label])
) as Record<DealStage, string>;

export const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "email", label: "Email" },
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
  { value: "task", label: "Task / follow-up" },
];

export const COMPANY_STATUSES = ["lead", "prospect", "customer", "churned"] as const;

export function formatMoney(value: number | null, currency = "EUR") {
  if (value == null) return "—";
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
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
