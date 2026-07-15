"use client";

import { useState } from "react";
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

export function NewCompanyDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" />
            New company
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New company</DialogTitle>
        </DialogHeader>
        <form action={createCompany} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" required placeholder="Acme d.o.o." />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="domain">Website domain</Label>
            <Input id="domain" name="domain" placeholder="acme.com" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" name="industry" placeholder="Manufacturing" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" name="country" placeholder="Slovenia" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="size">Company size</Label>
              <Input id="size" name="size" placeholder="50-200" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input id="linkedin_url" name="linkedin_url" placeholder="https://…" />
            </div>
          </div>
          <Button type="submit">Create company</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
