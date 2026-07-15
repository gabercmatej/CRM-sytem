import { redirect } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { getAuthContext } from "@/lib/supabase/server";
import { loadDemoData } from "../companies/actions";
import { updateWorkspaceName } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata = { title: "Settings" };

// Opus 4.8 pricing per million tokens.
const INPUT_PRICE = 5;
const OUTPUT_PRICE = 25;

export default async function SettingsPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const [{ data: workspace }, { data: runs }] = await Promise.all([
    auth.supabase
      .from("workspaces")
      .select("name")
      .eq("id", auth.workspaceId)
      .single(),
    auth.supabase
      .from("research_runs")
      .select("input_tokens, output_tokens"),
  ]);

  const inputTokens = (runs ?? []).reduce((s, r) => s + r.input_tokens, 0);
  const outputTokens = (runs ?? []).reduce((s, r) => s + r.output_tokens, 0);
  const estCost =
    (inputTokens / 1_000_000) * INPUT_PRICE +
    (outputTokens / 1_000_000) * OUTPUT_PRICE;

  const keys = [
    { name: "Anthropic (research, chat, email)", set: !!process.env.ANTHROPIC_API_KEY },
    { name: "OpenAI (embeddings for search)", set: !!process.env.OPENAI_API_KEY },
    { name: "Firecrawl (website crawling)", set: !!process.env.FIRECRAWL_API_KEY },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspace</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateWorkspaceName} className="flex items-end gap-3">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="name">Workspace name</Label>
              <Input id="name" name="name" defaultValue={workspace?.name ?? ""} />
            </div>
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI usage</CardTitle>
          <CardDescription>
            Research-agent token usage across all runs (chat and email drafts not
            included yet).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xl font-semibold">{inputTokens.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Input tokens</p>
          </div>
          <div>
            <p className="text-xl font-semibold">{outputTokens.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Output tokens</p>
          </div>
          <div>
            <p className="text-xl font-semibold">${estCost.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Est. cost</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">API keys</CardTitle>
          <CardDescription>
            Configured in <code>.env.local</code> (or Vercel project settings).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {keys.map((k) => (
            <div key={k.name} className="flex items-center gap-2 text-sm">
              {k.set ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : (
                <XCircle className="size-4 text-destructive" />
              )}
              {k.name}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Demo data</CardTitle>
          <CardDescription>
            Adds three sample companies with contacts and deals to this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={loadDemoData}>
            <Button variant="outline" type="submit">
              Load demo data
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
