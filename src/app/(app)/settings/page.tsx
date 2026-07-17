import { redirect } from "next/navigation";
import { Check, X } from "lucide-react";
import { getAuthContext } from "@/lib/supabase/server";
import { researchCostUsd } from "@/lib/constants";
import { resolveWorkspaceSettings } from "@/lib/workspace-settings";
import { DEMO_EMAIL } from "@/lib/demo/data";
import { PageHeader } from "@/components/page-header";
import {
  updateProfile,
  updateWorkspaceName,
  updateWorkspacePreferences,
} from "./actions";
import { AppearanceCard } from "./appearance-card";
import { DemoDataCard } from "./demo-data-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata = { title: "Settings" };

const CURRENCIES = ["EUR", "USD", "GBP", "CHF"];
const EMAIL_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "sl", label: "Slovenščina" },
];

export default async function SettingsPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const [{ data: workspace }, { data: runs }, userRes, demoRes] =
    await Promise.all([
      auth.supabase
        .from("workspaces")
        .select("name, settings")
        .eq("id", auth.workspaceId)
        .single(),
      auth.supabase.from("research_runs").select("input_tokens, output_tokens"),
      auth.supabase.auth.getUser(),
      auth.supabase
        .from("companies")
        .select("id", { count: "exact", head: true })
        .eq("is_demo", true),
    ]);

  const user = userRes.data.user;
  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ?? "";
  const settings = resolveWorkspaceSettings(workspace?.settings);
  const hasDemoData = (demoRes.count ?? 0) > 0;
  const isDemoAccount = user?.email === DEMO_EMAIL;

  const inputTokens = (runs ?? []).reduce((s, r) => s + r.input_tokens, 0);
  const outputTokens = (runs ?? []).reduce((s, r) => s + r.output_tokens, 0);
  const estCost = researchCostUsd(inputTokens, outputTokens);

  const keys = [
    { name: "Anthropic (research, chat, email, proposals)", set: !!process.env.ANTHROPIC_API_KEY },
    { name: "OpenAI (embeddings for search)", set: !!process.env.OPENAI_API_KEY },
    { name: "Firecrawl (website crawling)", set: !!process.env.FIRECRAWL_API_KEY },
  ];

  const selectClass =
    "border-input h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <PageHeader
        title="Settings"
        description="Profile, workspace preferences and integrations."
        className="mb-2"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Profile</CardTitle>
          <CardDescription>
            Signed in as {user?.email ?? "—"}. Your name is used for greetings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateProfile} className="flex items-end gap-3">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="display_name">Your name</Label>
              <Input
                id="display_name"
                name="display_name"
                placeholder="Matej"
                defaultValue={displayName}
              />
            </div>
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Workspace</CardTitle>
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

      <AppearanceCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Preferences</CardTitle>
          <CardDescription>
            Defaults used across deals, dashboards and the email workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateWorkspacePreferences} className="grid gap-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  name="currency"
                  defaultValue={settings.currency}
                  className={selectClass}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email_language">Email language</Label>
                <select
                  id="email_language"
                  name="email_language"
                  defaultValue={settings.email_language}
                  className={selectClass}
                >
                  {EMAIL_LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="follow_up_days">Follow-up after</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="follow_up_days"
                    name="follow_up_days"
                    type="number"
                    min={0}
                    max={60}
                    defaultValue={settings.follow_up_days}
                    className="w-full"
                  />
                  <span className="text-sm whitespace-nowrap text-muted-foreground">
                    days
                  </span>
                </div>
              </div>
            </div>
            <div>
              <Button type="submit">Save preferences</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">AI usage</CardTitle>
          <CardDescription>
            Research-agent token usage across all runs.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
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
          <CardTitle className="text-sm">API keys</CardTitle>
          <CardDescription>
            Configured in <code>.env.local</code> (or Vercel project settings).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {keys.map((k) => (
            <div key={k.name} className="flex items-center gap-2 text-sm">
              {k.set ? (
                <Check className="size-4 text-success" aria-label="Configured" />
              ) : (
                <X className="size-4 text-destructive" aria-label="Missing" />
              )}
              {k.name}
            </div>
          ))}
        </CardContent>
      </Card>

      <DemoDataCard hasDemoData={hasDemoData} isDemoAccount={isDemoAccount} />
    </div>
  );
}
