"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import type { DealStage } from "@/lib/database.types";
import { PIPELINE_STAGES, formatMoney, formatRelative } from "@/lib/constants";
import { STAGE_DOT_CLASS } from "@/components/stage-badge";
import { moveCompanyStage } from "../companies/actions";
import { cn } from "@/lib/utils";

export type BoardCompany = {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  stage: DealStage;
  position: number;
  /** Summed value of the company's non-lost deals. */
  dealValue: number;
  dealCount: number;
  researched: boolean;
  lastActivityAt: string | null;
};

export function KanbanBoard({
  companies: initial,
  currency = "EUR",
}: {
  companies: BoardCompany[];
  currency?: string;
}) {
  const [companies, setCompanies] = useState(initial);
  const [active, setActive] = useState<BoardCompany | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function handleDragStart(event: DragStartEvent) {
    setActive(companies.find((c) => c.id === event.active.id) ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActive(null);
    const { active: dragged, over } = event;
    if (!over) return;

    const companyId = String(dragged.id);
    const newStage = String(over.id) as DealStage;
    const company = companies.find((c) => c.id === companyId);
    if (!company || company.stage === newStage) return;

    const previous = companies;
    const newPosition = Date.now();
    setCompanies((cs) =>
      cs.map((c) =>
        c.id === companyId ? { ...c, stage: newStage, position: newPosition } : c
      )
    );

    const { error } = await moveCompanyStage(companyId, newStage, newPosition);
    if (error) {
      setCompanies(previous);
      toast.error(`Could not move company: ${error}`);
    }
  }

  return (
    <DndContext
      id="pipeline-board"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => (
          <Column
            key={stage.value}
            stage={stage}
            currency={currency}
            companies={companies
              .filter((c) => c.stage === stage.value)
              .sort((a, b) => a.position - b.position)}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {active && <CompanyCard company={active} currency={currency} overlay />}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  stage,
  companies,
  currency,
}: {
  stage: (typeof PIPELINE_STAGES)[number];
  companies: BoardCompany[];
  currency: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.value });
  // Column value = the summed deal value of every company in the stage.
  const total = companies.reduce((sum, c) => sum + c.dealValue, 0);

  return (
    <div
      className="flex w-72 shrink-0 flex-col rounded-xl bg-muted/50"
      aria-label={`${stage.label} — ${companies.length} companies`}
    >
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <div className="flex items-center gap-2">
          <span
            className={cn("size-2 rounded-full", STAGE_DOT_CLASS[stage.value])}
            aria-hidden
          />
          <span className="text-[13px] font-medium">{stage.label}</span>
          <span className="rounded-full bg-background px-1.5 text-xs tabular-nums text-muted-foreground ring-1 ring-foreground/5">
            {companies.length}
          </span>
        </div>
        {total > 0 && (
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {formatMoney(total, currency, { compact: true })}
          </span>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-32 flex-1 flex-col gap-2 rounded-b-xl p-2 transition-shadow",
          isOver && "ring-2 ring-ring/40 ring-inset"
        )}
      >
        {companies.map((company) => (
          <DraggableCard key={company.id} company={company} currency={currency} />
        ))}
        {companies.length === 0 && !isOver && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground/70">
            No companies
          </p>
        )}
      </div>
    </div>
  );
}

function DraggableCard({
  company,
  currency,
}: {
  company: BoardCompany;
  currency: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: company.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(isDragging && "opacity-40")}
    >
      <CompanyCard company={company} currency={currency} />
    </div>
  );
}

function CompanyCard({
  company,
  currency = "EUR",
  overlay,
}: {
  company: BoardCompany;
  currency?: string;
  overlay?: boolean;
}) {
  return (
    <div
      className={cn(
        "cursor-grab rounded-lg bg-card p-3 ring-1 ring-foreground/10",
        !overlay && "hover-lift",
        overlay && "rotate-1 shadow-lg"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/companies/${company.id}`}
          className="min-w-0 text-sm leading-tight font-medium hover:underline"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {company.name}
        </Link>
        {company.researched && (
          <Sparkles className="size-3.5 shrink-0 text-ai" aria-label="Researched" />
        )}
      </div>
      {company.industry ? (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {company.industry}
        </p>
      ) : null}
      <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground" suppressHydrationWarning>
          {company.lastActivityAt ? formatRelative(company.lastActivityAt) : "No activity"}
        </span>
        {company.dealValue > 0 ? (
          <span className="font-medium tabular-nums">
            {formatMoney(company.dealValue, currency)}
            {company.dealCount > 1 ? (
              <span className="ml-1 font-normal text-muted-foreground">
                · {company.dealCount} deals
              </span>
            ) : null}
          </span>
        ) : null}
      </div>
    </div>
  );
}
