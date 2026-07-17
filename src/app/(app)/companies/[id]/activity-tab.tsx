"use client";

import { useRef } from "react";
import { Check, Inbox, Trash2 } from "lucide-react";
import type { Activity, Contact } from "@/lib/database.types";
import { ACTIVITY_TYPES, formatDateTime, formatRelative } from "@/lib/constants";
import { completeTask, deleteActivity, logActivity } from "../actions";
import { ActivityIcon } from "@/components/activity-icon";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const NO_CONTACT = "none";

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

  const typeItems = ACTIVITY_TYPES.map((t) => ({ value: t.value, label: t.label }));
  const contactItems = [
    { value: NO_CONTACT, label: "—" },
    ...contacts.map((c) => ({ value: c.id, label: c.name })),
  ];
  const nowIso = new Date().toISOString();

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_2fr]">
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm">Log activity</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            ref={formRef}
            action={async (fd) => {
              if (fd.get("contact_id") === NO_CONTACT) fd.set("contact_id", "");
              await logActivity(companyId, fd);
              formRef.current?.reset();
            }}
            className="grid gap-4"
          >
            <div className="grid gap-2">
              <Label htmlFor="activity-type">Type</Label>
              <Select items={typeItems} name="type" defaultValue="note">
                <SelectTrigger id="activity-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeItems.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label htmlFor="activity-contact">Contact</Label>
              <Select items={contactItems} name="contact_id" defaultValue={NO_CONTACT}>
                <SelectTrigger id="activity-contact" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contactItems.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="due_at">Follow-up due (for tasks)</Label>
              <Input id="due_at" name="due_at" type="datetime-local" />
            </div>
            <Button type="submit">Log it</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {activities.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center">
            <Inbox className="size-5 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              No activity yet — notes, calls, emails and AI runs show up here.
            </p>
          </div>
        )}
        {activities.map((a) => {
          const isOpenTask = a.type === "task" && !a.completed_at;
          const overdue = isOpenTask && a.due_at != null && a.due_at < nowIso;
          return (
            <div
              key={a.id}
              className="flex items-start gap-3 rounded-lg bg-card p-3 ring-1 ring-foreground/10"
            >
              <ActivityIcon type={a.type} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{a.subject}</p>
                  <span
                    className="shrink-0 text-xs text-muted-foreground"
                    title={formatDateTime(a.created_at)}
                    suppressHydrationWarning
                  >
                    {formatRelative(a.created_at)}
                  </span>
                </div>
                {a.body && (
                  <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">
                    {a.body}
                  </p>
                )}
                {a.due_at && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {overdue ? (
                      <Badge variant="destructive">Overdue</Badge>
                    ) : null}
                    Due {formatDateTime(a.due_at)}
                    {a.completed_at ? " · done" : ""}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {isOpenTask && (
                  <Button
                    variant="outline"
                    size="icon-xs"
                    className="rounded-full text-success"
                    aria-label={`Complete “${a.subject}”`}
                    onClick={() => completeTask(a.id, companyId)}
                  >
                    <Check className="size-3" />
                  </Button>
                )}
                <ConfirmDialog
                  title="Delete this activity?"
                  confirmLabel="Delete"
                  onConfirm={() => deleteActivity(a.id, companyId)}
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                      aria-label={`Delete “${a.subject}”`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
