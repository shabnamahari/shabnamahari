import { NextResponse } from "next/server";

import { db } from "@/lib/chatbot/db/client";
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
   * Guessing is limited by the caller as well as by the row.
   *
   * `attempts` on the row stops a million guesses against one code. It does not
   * stop a script asking for a fresh code every time it burns one, which turns
   * five guesses per code into as many as it likes. This is the ceiling on the
   * whole activity.
   */
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const allowed = await db().rpc("check_rate_limit", {
    p_bucket: `authverify:ip:${ip}`,
    p_window_seconds: 15 * 60,
    p_limit: 20,
  });
  if (allowed.data === false) {
    return NextResponse.json(
      { error: "Too many tries. Wait a few minutes." },
      { status: 429 },
    );
  }

  // The newest unspent, unexpired code for this address. Newest because asking
  // again should supersede: someone who pressed "send code" twice is holding
  // the second email and would otherwise be typing a code the row no longer
  // agrees with.
  const { data: row } = await db()
    .from("email_codes")
    .select("id, code_hash, name, attempts")
    .eq("email", email)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .lt("attempts", CODE_MAX_ATTEMPTS)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return NextResponse.json(REFUSED, { status: 400 });

  if (!(await verifyCode(code, row.code_hash))) {
    // Counted before the reply, so a wrong guess costs something even if the
    // caller hangs up on the response.
    await db()
      .from("email_codes")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id);
    return NextResponse.json(REFUSED, { status: 400 });
  }

  // Spent, immediately and before anything else can go wrong. A code that has
  // been accepted once must not be acceptable again, whatever happens below.
  await db()
    .from("email_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id);

  const existing = await db()
    .from("accounts")
    .select("id, name")
    .ilike("email", email)
    .maybeSingle();

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
