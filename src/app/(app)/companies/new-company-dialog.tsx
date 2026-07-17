"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createCompany } from "./actions";
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
import { Textarea } from "@/components/ui/textarea";

export type CompanyPrefill = {
  name?: string | null;
  domain?: string | null;
  industry?: string | null;
  country?: string | null;
  size?: string | null;
  linkedin_url?: string | null;
  notes?: string | null;
};

/**
 * Shared "create company" dialog. Used from the Companies page (blank) and
 * from Find Leads (prefilled, with a custom server action that also marks
 * the lead as added).
 */
export function NewCompanyDialog({
  trigger,
  prefill,
  action = createCompany,
  title = "New company",
  submitLabel = "Create company",
}: {
  trigger?: React.ReactElement<Record<string, unknown>>;
  prefill?: CompanyPrefill;
  action?: (formData: FormData) => Promise<void>;
  title?: string;
  submitLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button>
              <Plus className="size-4" />
              New company
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          action={(formData) => startTransition(() => action(formData))}
          className="grid gap-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Acme d.o.o."
              defaultValue={prefill?.name ?? undefined}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="domain">Website domain</Label>
            <Input
              id="domain"
              name="domain"
              placeholder="acme.com"
              defaultValue={prefill?.domain ?? undefined}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                name="industry"
                placeholder="Manufacturing"
                defaultValue={prefill?.industry ?? undefined}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                name="country"
                placeholder="Slovenia"
                defaultValue={prefill?.country ?? undefined}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="size">Company size</Label>
              <Input
                id="size"
                name="size"
                placeholder="50-200"
                defaultValue={prefill?.size ?? undefined}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input
                id="linkedin_url"
                name="linkedin_url"
                placeholder="https://…"
                defaultValue={prefill?.linkedin_url ?? undefined}
              />
            </div>
          </div>
          {prefill?.notes ? (
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                defaultValue={prefill.notes}
              />
            </div>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : submitLabel}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
