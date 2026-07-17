import {
  AlarmClock,
  Bot,
  CalendarDays,
  Mail,
  NotebookPen,
  Phone,
  Send,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ActivityType } from "@/lib/database.types";
import { cn } from "@/lib/utils";

export const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
  email: Mail,
  call: Phone,
  meeting: CalendarDays,
  note: NotebookPen,
  task: AlarmClock,
  ai_research: Sparkles,
  ai_email: Send,
};

const AI_TYPES: ActivityType[] = ["ai_research", "ai_email"];

export function ActivityIcon({
  type,
  className,
}: {
  type: ActivityType;
  className?: string;
}) {
  const Icon = ACTIVITY_ICONS[type] ?? Bot;
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full bg-muted",
        AI_TYPES.includes(type) ? "text-ai" : "text-muted-foreground",
        className
      )}
    >
      <Icon className="size-3.5" aria-hidden />
    </span>
  );
}
