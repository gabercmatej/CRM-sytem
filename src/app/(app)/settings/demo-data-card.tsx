"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { loadDemoData, removeDemoData } from "../companies/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DemoDataCard({ hasDemoData }: { hasDemoData: boolean }) {
  const [loading, startLoading] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Demo data</CardTitle>
        <CardDescription>
          Five realistic companies with contacts, deals across every stage,
          activities and leads — enough to light up the dashboard, pipeline and
          analytics. Remove it all with one click when you’re done exploring.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={loading || hasDemoData}
          onClick={() =>
            startLoading(async () => {
              await loadDemoData();
              toast.success("Demo data loaded");
            })
          }
        >
          {loading ? "Loading…" : hasDemoData ? "Demo data loaded" : "Load demo data"}
        </Button>
        {hasDemoData && (
          <ConfirmDialog
            title="Remove all demo data?"
            description="Every demo company — with its contacts, deals, activities, research and documents — plus demo leads will be deleted. Your own data is untouched."
            confirmLabel="Remove demo data"
            onConfirm={async () => {
              await removeDemoData();
              toast.success("Demo data removed");
            }}
            render={
              <Button variant="destructive">
                <Trash2 className="size-4" />
                Remove demo data
              </Button>
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
