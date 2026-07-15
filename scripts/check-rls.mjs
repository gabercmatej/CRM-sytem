/**
 * Verifies multi-tenant isolation (row-level security).
 * Creates two throwaway users, inserts a company as user A,
 * asserts user B sees zero rows, then deletes both users.
 *
 * Usage: node scripts/check-rls.mjs   (reads .env.local)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Minimal .env.local loader (no dependency needed).
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {
  // fall through to process env
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error("Missing Supabase env vars — fill .env.local first (see SETUP.md).");
  process.exit(1);
}

const admin = createClient(url, serviceKey);
const stamp = Date.now();
const password = `rls-test-${stamp}-Aa1!`;
const emails = [`rls-a-${stamp}@example.com`, `rls-b-${stamp}@example.com`];
const userIds = [];

async function fail(message) {
  console.error(`❌ ${message}`);
  await cleanup();
  process.exit(1);
}

async function cleanup() {
  for (const id of userIds) {
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
}

// 1. Create two confirmed users (signup trigger creates their workspaces).
for (const email of emails) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) await fail(`Could not create test user: ${error.message}`);
  userIds.push(data.user.id);
}
console.log("✓ Created two test users (separate workspaces)");

// 2. Sign in as each with the anon key (RLS applies to these clients).
const clients = [];
for (const email of emails) {
  const client = createClient(url, anonKey);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) await fail(`Could not sign in: ${error.message}`);
  clients.push(client);
}

// 3. User A inserts a company into their workspace.
const { data: membership } = await clients[0]
  .from("workspace_members")
  .select("workspace_id")
  .single();
if (!membership) await fail("User A has no workspace — did the signup trigger run?");

const { error: insertError } = await clients[0].from("companies").insert({
  workspace_id: membership.workspace_id,
  name: "RLS Test Co",
});
if (insertError) await fail(`User A could not insert: ${insertError.message}`);
console.log("✓ User A created a company in their workspace");

// 4. User A sees it; user B must not.
const { data: aRows } = await clients[0].from("companies").select("id");
if (!aRows?.length) await fail("User A cannot see their own company");
console.log("✓ User A can read their own data");

const { data: bRows } = await clients[1].from("companies").select("id");
if (bRows?.length) await fail(`LEAK: user B sees ${bRows.length} rows from user A's workspace!`);
console.log("✓ User B sees zero rows — workspaces are isolated");

// 5. User B cannot insert into A's workspace either.
const { error: crossInsert } = await clients[1].from("companies").insert({
  workspace_id: membership.workspace_id,
  name: "Should be rejected",
});
if (!crossInsert) await fail("LEAK: user B inserted into user A's workspace!");
console.log("✓ Cross-workspace insert rejected");

await cleanup();
console.log("\n✅ Row-level security verified. Test users removed.");
