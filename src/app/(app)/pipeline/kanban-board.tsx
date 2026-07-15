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
import type { DealStage } from "@/lib/database.types";
import { DEAL_STAGES, formatMoney } from "@/lib/constants";
import { moveDeal } from "../companies/actions";
import { cn } from "@/lib/utils";

export type BoardDeal = {
  id: string;
  title: string;
  stage: DealStage;
  value: number | null;
  currency: string;
  position: number;
  companyId: string;
  companyName: string;
};

export function KanbanBoard({ initialDeals }: { initialDeals: BoardDeal[] }) {
  const [deals, setDeals] = useState(initialDeals);
  const [activeDeal, setActiveDeal] = useState<BoardDeal | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveDeal(deals.find((d) => d.id === event.active.id) ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDeal(null);
    const { active, over } = event;
    if (!over) return;

    const dealId = String(active.id);
    const newStage = String(over.id) as DealStage;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === newStage) return;

    const previous = deals;
    const newPosition = Date.now();
    setDeals((ds) =>
      ds.map((d) =>
        d.id === dealId ? { ...d, stage: newStage, position: newPosition } : d
      )
    );

    const { error } = await moveDeal(dealId, newStage, newPosition);
    if (error) {
      setDeals(previous);
      toast.error(`Could not move deal: ${error}`);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {DEAL_STAGES.map((stage) => (
          <Column
            key={stage.value}
            stage={stage}
            deals={deals
              .filter((d) => d.stage === stage.value)
              .sort((a, b) => a.position - b.position)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeDeal && <DealCard deal={activeDeal} overlay />}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  stage,
  deals,
}: {
  stage: (typeof DEAL_STAGES)[number];
  deals: BoardDeal[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.value });
  const total = deals.reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-64 shrink-0 flex-col rounded-lg border bg-background",
        isOver && "ring-2 ring-primary/40"
      )}
    >
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", stage.color)} />
          <span className="text-sm font-medium">{stage.label}</span>
          <span className="text-xs text-muted-foreground">{deals.length}</span>
        </div>
        {total > 0 && (
          <span className="text-xs text-muted-foreground">
            {formatMoney(total)}
          </span>
        )}
      </div>
      <div className="flex min-h-24 flex-1 flex-col gap-2 p-2">
        {deals.map((deal) => (
          <DraggableCard key={deal.id} deal={deal} />
        ))}
      </div>
    </div>
  );
}

function DraggableCard({ deal }: { deal: BoardDeal }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(isDragging && "opacity-40")}
    >
      <DealCard deal={deal} />
    </div>
  );
}

function DealCard({ deal, overlay }: { deal: BoardDeal; overlay?: boolean }) {
  return (
    <div
      className={cn(
        "cursor-grab rounded-md border bg-card p-3 shadow-xs",
        overlay && "rotate-2 shadow-lg"
      )}
    >
      <p className="text-sm font-medium leading-tight">{deal.title}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <Link
          href={`/companies/${deal.companyId}`}
          className="truncate hover:text-foreground hover:underline"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {deal.companyName}
        </Link>
        <span className="shrink-0">{formatMoney(deal.value, deal.currency)}</span>
      </div>
    </div>
  );
}
