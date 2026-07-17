import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-2xl py-16">
      <EmptyState
        icon={SearchX}
        title="Not found"
        description="This page doesn’t exist — or it belongs to a different workspace."
        action={
          <Button render={<Link href="/dashboard" />}>Back to dashboard</Button>
        }
      />
    </div>
  );
}
