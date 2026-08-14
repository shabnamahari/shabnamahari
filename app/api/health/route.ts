import { NextResponse } from "next/server";

import { currentAdmin } from "@/lib/admin/auth";
import { reachableSiteUrl, siteUrl } from "@/lib/site-url";

/**
 * Which pieces of configuration this deployment can actually see.
 *
 * Written because we could not find out any other way. The live site kept
 * falling back to its hardcoded greeting and the assistant answered
 * "SUPABASE_SERVICE_ROLE_KEY is not set", while the same variables sat in the
 * Vercel dashboard looking correct. Two deploys were spent guessing at the
 * difference between what was configured and what the running code was handed.
 *
 * It reports **names and lengths, never values** — enough to tell "absent" from
 * "present but truncated" or "pasted with the quotes still on", which are the
 * three ways this goes wrong, and not enough to be worth stealing. The one
 * thing it must never do is print a secret, so it does not have access to one:
 * `seen()` returns a boolean and a number and nothing else.
 */

export const dynamic = "force-dynamic";

const EXPECTED = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "OPENROUTER_API_KEY",
  "OPENROUTER_BASE_URL",
  "COHERE_API_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_WEBHOOK_SECRET",
] as const;

function seen(name: string): { set: boolean; length: number; quoted: boolean } {
  const value = process.env[name] ?? "";
  return {
    set: value.length > 0,
    length: value.length,
    // A value pasted with its quotes still attached is set, is the right
    // length, and is wrong.
    quoted: /^["']|["']$/.test(value),
  };
}

export async function GET() {
  const config = Object.fromEntries(EXPECTED.map((name) => [name, seen(name)]));
  const missing = EXPECTED.filter((name) => !seen(name).set);

  // Signed out, this says whether something is wrong and nothing about what.
  //
  // The detail below is not a secret — names, lengths, a flag — but together it
  // is a free description of which providers this site is wired to and whether
  // their keys are present and well formed, on a public URL, to anybody who
  // guesses the path. That is reconnaissance, and it costs nothing to withhold.
  //
  // The unauthenticated answer is deliberately not empty. The reason this file
  // exists is a morning spent unable to tell a misconfigured deployment from a
  // broken one, and `ok: false` is the signal that was missing — it has to
  // survive even when the thing that is misconfigured is the sign-in itself.
  const admin = await currentAdmin();
  if (!admin) {
    return NextResponse.json(
      { ok: missing.length === 0 },
      { status: missing.length === 0 ? 200 : 503 },
    );
  }

  return NextResponse.json(
    {
      ok: missing.length === 0,
      missing,
      runtime: process.env.NEXT_RUNTIME ?? "nodejs",
      vercelEnv: process.env.VERCEL_ENV ?? "local",
      // Printed in full, unlike everything above it, because it is not a secret
      // — it is this site's public address. It is here because a handoff
      // notification carries a link built from it, and an empty one means
      // Shabnam gets told someone needs her with no way to reach the
      // conversation. That failure is silent everywhere else.
      siteUrl: siteUrl() || null,
      // What a Telegram notification would actually put in a message. Reported
      // separately because the two differ exactly where it matters: on a
      // laptop the first is localhost and the second is empty, and the whole
      // point is that the second never becomes a link nobody can press.
      reachableSiteUrl: reachableSiteUrl() || null,
      config,
    },
    { status: missing.length === 0 ? 200 : 503 },
  );
}
