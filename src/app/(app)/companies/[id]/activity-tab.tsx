"use client";

import { useRef } from "react";
import {
  Bot,
  Calendar,
  CheckCircle2,
  Circle,
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
  Trash2,
} from "lucide-react";
import type { Activity, ActivityType, Contact } from "@/lib/database.types";
import { ACTIVITY_TYPES, formatDateTime } from "@/lib/constants";
import { completeTask, deleteActivity, logActivity } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const TYPE_ICONS: Record<ActivityType, React.ElementType> = {
  email: Mail,
  call: Phone,
  meeting: Calendar,
  note: StickyNote,
  task: Circle,
  ai_research: Bot,
  ai_email: Bot,
};

export function ActivityTab({
  companyId,
  activities,
  contacts,
}: {
  companyId: string;
  activities: Activity[];
  contacts: Contact[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">Log activity</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            ref={formRef}
            action={async (fd) => {
              await logActivity(companyId, fd);
              formRef.current?.reset();
            }}
            className="grid gap-4"
          >
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                name="type"
                defaultValue="note"
                className="border-input h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs"
              >
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input id="subject" name="subject" required placeholder="Called about the offer" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="body">Details</Label>
              <Textarea id="body" name="body" rows={3} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact_id">Contact</Label>
              <select
                id="contact_id"
                name="contact_id"
                defaultValue=""
                className="border-input h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs"
              >
                <option value="">—</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="due_at">Follow-up due (for tasks)</Label>
              <Input id="due_at" name="due_at" type="datetime-local" />
            </div>
            <Button type="submit">Log it</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {activities.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No activity yet. Notes, calls, emails and AI runs show up here.
          </p>
        )}
        {activities.map((a) => {
          const Icon = TYPE_ICONS[a.type] ?? MessageSquare;
          const isOpenTask = a.type === "task" && !a.completed_at;
          return (
            <div
              key={a.id}
              className="flex items-start gap-3 rounded-lg border bg-background p-3"
            >
              <div className="mt-0.5 rounded-full bg-muted p-2">
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{a.subject}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(a.created_at)}
                  </span>
                </div>
                {a.body && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {a.body}
                  </p>
                )}
                {a.due_at && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Due {formatDateTime(a.due_at)}
                    {a.completed_at ? " · done" : ""}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {isOpenTask && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-emerald-600"
                    title="Mark done"
                    onClick={() => completeTask(a.id, companyId)}
                  >
                    <CheckCircle2 className="size-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground"
                  onClick={() => deleteActivity(a.id, companyId)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
