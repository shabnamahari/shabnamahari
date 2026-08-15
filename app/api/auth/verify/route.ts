import { NextResponse } from "next/server";

import { db } from "@/lib/chatbot/db/client";
import { fromOurOwnPage } from "@/lib/account/request";
import {
  CODE_MAX_ATTEMPTS,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  issueSession,
  verifyCode,
} from "@/lib/account/session";

/**
 * Spend a code, and become whoever the address belongs to.
 *
 * The one endpoint where signing in and signing up are the same act, which is
 * Shabnam's decision: an address that has an account is let into it, and one
 * that does not gets an account made. Nobody has to know in advance which of
 * the two they are doing, and the form never has to ask.
 *
 * The name is taken from the row the code was stored with rather than from this
 * request. By the time anyone gets here the address has been proven and the
 * name has not been looked at since it was typed — reading it off the incoming
 * body would let the second half of the round trip claim to be called anything.
 */

/** One reply for every way of being wrong, so guessing learns nothing. */
const REFUSED = { error: "That code is not right, or it has expired." } as const;

function normalise(email: string): string {
  return email.trim().toLowerCase();
}

export async function POST(request: Request) {
  // Before anything else: this hands back a session cookie, so it must be our
  // own page asking. See the helper for why the content type does the work.
  if (!fromOurOwnPage(request)) {
    return NextResponse.json({ error: "Bad request." }, { status: 403 });
  }

  let body: { email?: unknown; code?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? normalise(body.email) : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";

  if (!email || !/^\d{6}$/.test(code)) {
    return NextResponse.json(REFUSED, { status: 400 });
  }

  /*
   * Guessing is limited by the caller as well as by the code.
   *
   * The per-code ceiling stops a million guesses against one code. It does not
   * stop a script asking for a fresh code every time it burns one, which turns
   * five guesses per code into as many as it likes. This is the ceiling on the
   * whole activity.
   *
   * Closed rather than open on failure. `data === false` alone let an RPC error
   * — a dropped connection, a blip — through as "not limited", which is to say
   * the only ceiling on brute force disappeared exactly when the database was
   * unwell. A limiter that cannot answer has to be treated as a no.
   */
  const gate = await db().rpc("check_rate_limit", {
    p_bucket: `authverify:ip:${
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    }`,
    p_window_seconds: 15 * 60,
    p_limit: 20,
  });
  if (gate.error) {
    console.error("[auth] the rate limiter did not answer:", gate.error);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 503 },
    );
  }
  if (gate.data === false) {
    return NextResponse.json(
      { error: "Too many tries. Wait a few minutes." },
      { status: 429 },
    );
  }

  /*
   * One guess, claimed in the database rather than counted here.
   *
   * Read-compare-write in the application enforced the five-guess ceiling
   * against one caller at a time and against nobody at all in parallel: fifty
   * simultaneous requests all read `attempts` as 0 and all fifty passed. The
   * increment and the decision are now a single statement, and this gets a row
   * back only if it holds one of the five.
   */
  const claim = await db().rpc("claim_code_attempt", {
    p_email: email,
    p_max_attempts: CODE_MAX_ATTEMPTS,
  });

  if (claim.error) {
    console.error("[auth] could not claim an attempt:", claim.error);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 },
    );
  }

  const row = (claim.data as { id: string; code_hash: string; name: string | null }[])?.[0];
  if (!row) return NextResponse.json(REFUSED, { status: 400 });

  if (!(await verifyCode(code, row.code_hash))) {
    // The attempt was already spent by the claim above, so a caller who hangs
    // up on this response has still paid for the guess.
    return NextResponse.json(REFUSED, { status: 400 });
  }

  /*
   * Spent, and only one caller may spend it.
   *
   * Two requests holding the same correct code would both have found
   * `consumed_at` null and both been handed a session. The guard is inside the
   * statement now, and the loser is refused.
   */
  const spent = await db().rpc("consume_code", { p_id: row.id });
  if (spent.error || spent.data !== true) {
    return NextResponse.json(REFUSED, { status: 400 });
  }

  /*
   * `eq`, never `ilike`.
   *
   * This was `.ilike("email", email)`, and PostgREST passes that straight to
   * SQL as a LIKE pattern — where `_` matches any character. Someone who could
   * receive mail at `john_smith@corp.com` could prove *that* address, and this
   * lookup would hand them `john.smith@corp.com`'s account. The addresses are
   * lowercased on the way in and on the way out, so an exact match is all that
   * was ever needed.
   */
  const existing = await db()
    .from("accounts")
    .select("id, name")
    .eq("email", email)
    .maybeSingle();

  if (existing.error) {
    // Not survivable by falling through to the insert: that would collide with
    // the unique index and 500 *after* the code had been spent, which locks
    // someone out of an account they just proved they own.
    console.error("[auth] could not read the account:", existing.error);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 },
    );
  }

  let accountId: string;

  if (existing.data) {
    accountId = existing.data.id;
    await db()
      .from("accounts")
      .update({
        last_seen_at: new Date().toISOString(),
        // Only fills a gap. Someone signing in again should not have the name
        // they set overwritten by whatever was in the form this time.
        ...(existing.data.name ? {} : row.name ? { name: row.name } : {}),
      })
      .eq("id", accountId);
  } else {
    const created = await db()
      .from("accounts")
      .insert({ email, name: row.name })
      .select("id")
      .single();

    if (created.error || !created.data) {
      console.error("[auth] could not create an account:", created.error);
      return NextResponse.json(
        { error: "Something went wrong. Try again." },
        { status: 500 },
      );
    }
    accountId = created.data.id;
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, issueSession(accountId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
