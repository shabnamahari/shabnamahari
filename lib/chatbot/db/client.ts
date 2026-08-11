import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The one way the application reaches the database.
 *
 * Every table has RLS enabled with no policies, so the anon key reads nothing —
 * by design. All real access runs through the service role key, which bypasses
 * RLS entirely and must therefore never leave the server. Two things enforce
 * that: the `server-only` import above, which makes this module a build error
 * if a Client Component imports it, and the absence of any `NEXT_PUBLIC_`
 * prefix on the variables below.
 */

let cached: SupabaseClient | null = null;

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export function db(): SupabaseClient {
  if (cached) return cached;

  cached = createClient(
    required("SUPABASE_URL"),
    required("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        // No user sessions on this client — it is a server identity, and
        // persisting or refreshing a session for it would be meaningless at
        // best and a leak between requests at worst.
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  return cached;
}
