/**
 * Proves that the anon key cannot read anything.
 *
 *   npx tsx scripts/rls-check.ts
 *
 * This is the phase 1 acceptance test. Every table has RLS enabled with no
 * policies and the schema grant revoked, so an anon client must fail or come
 * back empty for all of them — and the service role must still work, otherwise
 * the lockdown has taken the application down with it.
 *
 * A table that returns rows to anon is a failure, not a warning: these tables
 * hold conversation transcripts and lead contact details.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const TABLES = [
  "documents",
  "chunks",
  "unified_users",
  "conversations",
  "messages",
  "leads",
  "intake_log",
  "feedback",
  "unanswered",
  "handoffs",
  "settings",
  "prompt_versions",
  "channel_copy",
  "model_config",
  "pinned_models",
  "embedding_config",
  "budget_config",
  "admin_users",
  "audit_log",
] as const;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

async function main() {
  const url = required("SUPABASE_URL");
  const anon = createClient(url, required("SUPABASE_ANON_KEY"), {
    auth: { persistSession: false },
  });
  const service = createClient(url, required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });

  const leaked: string[] = [];

  for (const table of TABLES) {
    const { data, error } = await anon.from(table).select("*").limit(1);

    // Either outcome is a pass. An error means the grant is gone (the schema
    // is not even visible); an empty array means RLS returned no rows. Both
    // mean nothing reached the caller.
    if (error) {
      console.log(`✓ ${table.padEnd(18)} blocked (${error.code ?? "error"})`);
    } else if (!data || data.length === 0) {
      console.log(`✓ ${table.padEnd(18)} empty to anon`);
    } else {
      console.log(`✗ ${table.padEnd(18)} READABLE BY ANON — ${data.length} row(s)`);
      leaked.push(table);
    }
  }

  // The other half of the test. If the service role is also blocked, the
  // policies are wrong in the opposite direction and every check above passed
  // for the wrong reason.
  const { error: serviceError } = await service
    .from("settings")
    .select("key")
    .limit(1);

  if (serviceError) {
    console.log(`\n✗ service role cannot read settings: ${serviceError.message}`);
    process.exit(1);
  }
  console.log("\n✓ service role reads normally");

  if (leaked.length > 0) {
    console.log(`\n${leaked.length} table(s) exposed to anon: ${leaked.join(", ")}`);
    process.exit(1);
  }

  console.log(`✓ all ${TABLES.length} tables closed to anon`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
