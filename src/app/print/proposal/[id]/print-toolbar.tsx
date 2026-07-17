"use client";

import { ArrowLeft, Printer } from "lucide-react";
import { useRouter } from "next/navigation";

/** Floating actions on the print view; hidden when actually printing. */
export function PrintToolbar({ backHref }: { backHref: string }) {
  const router = useRouter();
  return (
    <div className="fixed top-4 right-4 flex gap-2 print:hidden">
      <button
        type="button"
        onClick={() => router.push(backHref)}
        className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-neutral-700"
      >
        <Printer className="size-4" aria-hidden />
        Print / Save as PDF
      </button>
    </div>
  );
}
