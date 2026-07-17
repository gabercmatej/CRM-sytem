"use client";

import { useState, useTransition } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Company, Deal } from "@/lib/database.types";
import { PIPELINE_STAGES, formatDate, formatMoney } from "@/lib/constants";
import { createDeal, deleteCompany, deleteDeal, updateCompany } from "../actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StageBadge } from "@/components/stage-badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";

const STAGE_ITEMS = PIPELINE_STAGES.map((s) => ({ value: s.value, label: s.label }));

export function OverviewTab({
  company,
  deals,
}: {
  company: Company;
  deals: Deal[];
}) {
  const [dealOpen, setDealOpen] = useState(false);
  const [saving, startSaving] = useTransition();

  const totalValue = deals
    .filter((d) => d.stage !== "lost")
    .reduce((s, d) => s + (d.value ?? 0), 0);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Details</CardTitle>
          <CardAction>
            <ConfirmDialog
              title="Delete this company?"
              description="Contacts, deals, activities, research and the knowledge base for this company are removed with it. This can’t be undone."
              confirmLabel="Delete company"
              onConfirm={() => deleteCompany(company.id)}
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Delete company">
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              }
            />
          </CardAction>
        </CardHeader>
        <CardContent>
          <form
            action={(fd) =>
              startSaving(async () => {
                await updateCompany(company.id, fd);
                toast.success("Company saved");
              })
            }
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
                <Label htmlFor="company-stage">Pipeline stage</Label>
                <Select items={STAGE_ITEMS} name="stage" defaultValue={company.stage}>
                  <SelectTrigger id="company-stage" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGE_ITEMS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            <div>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">
              Deals
              {totalValue > 0 ? (
                <span className="ml-1.5 font-normal text-muted-foreground">
                  {formatMoney(totalValue)}
                </span>
              ) : null}
            </CardTitle>
            <CardAction>
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
                      <Label htmlFor="deal-title">Title *</Label>
                      <Input id="deal-title" name="title" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="deal-value">Value (EUR)</Label>
                        <Input id="deal-value" name="value" type="number" min="0" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="deal-stage">Stage</Label>
                        <Select items={STAGE_ITEMS} name="stage" defaultValue="new">
                          <SelectTrigger id="deal-stage" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STAGE_ITEMS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="deal-close">Expected close</Label>
                      <Input id="deal-close" name="expected_close" type="date" />
                    </div>
                    <Button type="submit">Create deal</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2">
            {deals.length === 0 && (
              <p className="py-2 text-sm text-muted-foreground">
                No deals yet — add one when there’s money on the table.
              </p>
            )}
            {deals.map((deal) => (
              <div
                key={deal.id}
                className="flex items-start justify-between gap-2 rounded-lg bg-muted/40 p-3"
              >
                <div className="min-w-0 space-y-1.5">
                  <p className="truncate text-sm font-medium">{deal.title}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <StageBadge stage={deal.stage} />
                    <span className="text-xs font-medium tabular-nums">
                      {formatMoney(deal.value, deal.currency)}
                    </span>
                    {deal.expected_close ? (
                      <span className="text-xs text-muted-foreground">
                        closes {formatDate(deal.expected_close)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <ConfirmDialog
                  title="Delete this deal?"
                  confirmLabel="Delete"
                  onConfirm={() => deleteDeal(deal.id, company.id)}
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-muted-foreground"
                      aria-label={`Delete deal “${deal.title}”`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {company.research_summary ? (
          <Card size="sm" className="bg-ai/5 ring-ai/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="size-4 text-ai" aria-hidden />
                AI summary
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-foreground/90">
              {company.research_summary}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
