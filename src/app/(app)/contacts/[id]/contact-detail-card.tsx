"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import type { Contact } from "@/lib/database.types";
import { updateContact, deleteContactGlobal } from "../../companies/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactDetailCard({ contact }: { contact: Contact }) {
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
        <CardAction>
          <ConfirmDialog
            title="Delete this contact?"
            description="Activities linked to this contact are kept, but lose the association. This can’t be undone."
            confirmLabel="Delete contact"
            onConfirm={() => deleteContactGlobal(contact.id)}
            render={
              <Button variant="ghost" size="icon-sm" aria-label="Delete contact">
                <Trash2 className="size-4 text-destructive" />
              </Button>
            }
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        <form
          action={(formData) =>
            startTransition(async () => {
              await updateContact(contact.id, formData);
              toast.success("Contact saved");
            })
          }
          className="grid gap-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={contact.name} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Role</Label>
              <Input id="title" name="title" defaultValue={contact.title ?? ""} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={contact.email ?? ""} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={contact.phone ?? ""} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input
                id="linkedin_url"
                name="linkedin_url"
                defaultValue={contact.linkedin_url ?? ""}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={5}
              placeholder="Preferences, context, how you met…"
              defaultValue={contact.notes ?? ""}
            />
          </div>
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
