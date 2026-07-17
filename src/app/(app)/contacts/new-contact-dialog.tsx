"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createContactGlobal } from "../companies/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function NewContactDialog({
  companies,
  defaultCompanyId,
}: {
  companies: { id: string; name: string }[];
  defaultCompanyId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const items = companies.map((c) => ({ value: c.id, label: c.name }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" />
            New contact
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New contact</DialogTitle>
        </DialogHeader>
        <form
          action={(formData) =>
            startTransition(async () => {
              await createContactGlobal(formData);
              setOpen(false);
            })
          }
          className="grid gap-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="contact-company">Company *</Label>
            <Select
              items={items}
              name="company_id"
              defaultValue={defaultCompanyId ?? items[0]?.value}
              required
            >
              <SelectTrigger id="contact-company" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contact-name">Name *</Label>
            <Input id="contact-name" name="name" required placeholder="Ana Kovač" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="contact-title">Role</Label>
              <Input id="contact-title" name="title" placeholder="CTO" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input id="contact-email" name="email" type="email" placeholder="ana@acme.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="contact-phone">Phone</Label>
              <Input id="contact-phone" name="phone" placeholder="+386 …" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact-linkedin">LinkedIn URL</Label>
              <Input id="contact-linkedin" name="linkedin_url" placeholder="https://…" />
            </div>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create contact"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
