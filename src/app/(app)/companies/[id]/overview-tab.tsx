"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Company, Deal } from "@/lib/database.types";
import {
  COMPANY_STATUSES,
  DEAL_STAGES,
  STAGE_LABELS,
  formatMoney,
} from "@/lib/constants";
import { createDeal, deleteCompany, deleteDeal, updateCompany } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function OverviewTab({
  company,
  deals,
}: {
  company: Company;
  deals: Deal[];
}) {
  const [dealOpen, setDealOpen] = useState(false);

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (fd) => {
              await updateCompany(company.id, fd);
              toast.success("Company saved");
            }}
            className="grid gap-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={company.name} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="domain">Domain</Label>
                <Input id="domain" name="domain" defaultValue={company.domain ?? ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="industry">Industry</Label>
                <Input id="industry" name="industry" defaultValue={company.industry ?? ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" name="country" defaultValue={company.country ?? ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="size">Size</Label>
                <Input id="size" name="size" defaultValue={company.size ?? ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue={company.status}
                  className="border-input h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs capitalize"
                >
                  {COMPANY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input
                id="linkedin_url"
                name="linkedin_url"
                defaultValue={company.linkedin_url ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={4}
                defaultValue={company.notes ?? ""}
                placeholder="Anything worth remembering about this company…"
              />
            </div>
            <div className="flex items-center justify-between">
              <Button type="submit">Save</Button>
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (confirm("Delete this company and all its data?")) {
                    deleteCompany(company.id);
                  }
                }}
              >
                <Trash2 className="size-4" />
                Delete company
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Deals</CardTitle>
          <Dialog open={dealOpen} onOpenChange={setDealOpen}>
            <DialogTrigger
              render={
                <Button size="sm" variant="outline">
                  <Plus className="size-4" /> Add
                </Button>
              }
            />
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>New deal</DialogTitle>
              </DialogHeader>
              <form
                action={async (fd) => {
                  await createDeal(company.id, fd);
                  setDealOpen(false);
                }}
                className="grid gap-4"
              >
                <div className="grid gap-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input id="title" name="title" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="value">Value (EUR)</Label>
                    <Input id="value" name="value" type="number" min="0" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="stage">Stage</Label>
                    <select
                      id="stage"
                      name="stage"
                      defaultValue="new"
                      className="border-input h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs"
                    >
                      {DEAL_STAGES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expected_close">Expected close</Label>
                  <Input id="expected_close" name="expected_close" type="date" />
                </div>
                <Button type="submit">Create deal</Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-3">
          {deals.length === 0 && (
            <p className="text-sm text-muted-foreground">No deals yet.</p>
          )}
          {deals.map((deal) => (
            <div
              key={deal.id}
              className="flex items-start justify-between gap-2 rounded-md border p-3"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium">{deal.title}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{STAGE_LABELS[deal.stage]}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatMoney(deal.value, deal.currency)}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                onClick={() => deleteDeal(deal.id, company.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
