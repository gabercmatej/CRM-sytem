"use client";

import { useState } from "react";
import { ExternalLink, Mail, Phone, Plus, Trash2 } from "lucide-react";
import type { Contact } from "@/lib/database.types";
import { createContact, deleteContact } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ContactsTab({
  companyId,
  contacts,
}: {
  companyId: string;
  contacts: Contact[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button size="sm">
                <Plus className="size-4" /> Add contact
              </Button>
            }
          />
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>New contact</DialogTitle>
            </DialogHeader>
            <form
              action={async (fd) => {
                await createContact(companyId, fd);
                setOpen(false);
              }}
              className="grid gap-4"
            >
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="title">Job title</Label>
                <Input id="title" name="title" placeholder="CEO" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="linkedin_url">LinkedIn</Label>
                  <Input id="linkedin_url" name="linkedin_url" placeholder="https://…" />
                </div>
              </div>
              <Button type="submit">Add contact</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {contacts.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No contacts yet — add the people you talk to at this company.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {contacts.map((contact) => (
            <Card key={contact.id}>
              <CardContent className="flex items-start justify-between gap-2 pt-0">
                <div className="space-y-1">
                  <p className="font-medium">{contact.name}</p>
                  {contact.title && (
                    <p className="text-sm text-muted-foreground">{contact.title}</p>
                  )}
                  <div className="flex flex-col gap-1 pt-1 text-sm text-muted-foreground">
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="inline-flex items-center gap-1.5 hover:text-foreground"
                      >
                        <Mail className="size-3.5" /> {contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="size-3.5" /> {contact.phone}
                      </span>
                    )}
                    {contact.linkedin_url && (
                      <a
                        href={contact.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 hover:text-foreground"
                      >
                        <ExternalLink className="size-3.5" /> LinkedIn profile
                      </a>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground"
                  onClick={() => deleteContact(companyId, contact.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
