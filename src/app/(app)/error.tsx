"use client";

import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl py-16">
      <EmptyState
        icon={CircleAlert}
        title="Something went wrong"
        description={
          error.message?.includes("column")
            ? "The database schema looks out of date — make sure the latest migration in supabase/migrations has been applied."
            : "An unexpected error occurred. Try again — if it keeps happening, check the server logs."
        }
        action={
          <Button variant="outline" onClick={reset}>
            Try again
          </Button>
        }
      />
    </div>
  );
}
