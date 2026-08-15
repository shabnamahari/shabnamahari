import { NextResponse } from "next/server";

import { db } from "@/lib/chatbot/db/client";
import { fromOurOwnPage } from "@/lib/account/request";
import { sendCodeEmail } from "@/lib/account/mail";
import { CODE_TTL_SECONDS, hashCode, newCode } from "@/lib/account/session";

/**
 * Send a sign-in code to an address.
 *
 * Public and unauthenticated by necessity — proving you can read a mailbox is
 * the whole point, so there is nothing to check first. That makes it two things
 * worth guarding: a way to send email to strangers, and a way to find out who
 * has an account here.
 *
 * The first is `check_rate_limit`, twice. Per address, so one mailbox cannot be
 * buried; and per IP, so a script cannot walk a list of addresses and bury all
 * of them one message each. Both are the database's atomic counter rather than
 * anything held in this process, because every request may land on a different
 * instance and a per-instance limit is no limit.
 *
 * The second is the reply. It is the same reply whether the address has an
 * account, has none, or is not an address anyone reads: "if that is a real
 * mailbox, a code is on its way". Saying "no account found" would turn this
 * endpoint into a way to test whether a given person is a customer of Shabnam's.
 */

/** The same words whatever happened, so the answer carries no information. */
const SENT = { ok: true } as const;

function normalise(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Deliberately loose. This is not the check that matters — the code is, because
 * an address that does not exist never produces one. A strict pattern here only
 * turns away real addresses with apostrophes and new top-level domains.
 */
function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export async function POST(request: Request) {
  // No session comes back from this one, but it spends Shabnam's sending quota
  // on demand, which is reason enough to want it to be our own page asking.
  if (!fromOurOwnPage(request)) {
    return NextResponse.json({ error: "Bad request." }, { status: 403 });
  }

  let body: { email?: unknown; name?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? normalise(body.email) : "";
  const name =
    typeof body.name === "string" && body.name.trim() !== ""
      ? body.name.trim().slice(0, 120)
      : null;

  if (!looksLikeEmail(email)) {
    return NextResponse.json(
      { error: "That does not look like an email address." },
      { status: 400 },
    );
  }

  /*
   * The address first, then the caller.
   *
   * Three in fifteen minutes to one mailbox covers a code that went to spam and
   * a second try; twenty an hour from one address covers a household or an
   * office on one NAT without covering a list being walked.
   *
   * Both fail *closed*. Testing `data === false` alone let an RPC error through
   * as "not limited", so a database blip turned the one thing standing between
   * a script and Shabnam's sending quota into nothing at all — silently, since
   * nothing logged it either. A limiter that cannot answer is a no.
   */
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  for (const [bucket, windowSeconds, limit] of [
    [`authcode:email:${email}`, 15 * 60, 3],
    [`authcode:ip:${ip}`, 60 * 60, 20],
  ] as const) {
    const gate = await db().rpc("check_rate_limit", {
      p_bucket: bucket,
      p_window_seconds: windowSeconds,
      p_limit: limit,
    });
    if (gate.error) {
      console.error("[auth] the rate limiter did not answer:", gate.error);
      return NextResponse.json(
        { error: "Something went wrong. Try again." },
        { status: 503 },
      );
    }
    // The neutral reply, not a refusal: whether this address is being limited
    // is itself something a stranger does not get to learn by asking.
    if (gate.data === false) return NextResponse.json(SENT);
  }

  const code = newCode();

  const { error } = await db()
    .from("email_codes")
    .insert({
      email,
      code_hash: await hashCode(code),
      name,
      expires_at: new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString(),
    });

  if (error) {
    console.error("[auth] could not store a code:", error);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 },
    );
  }

  try {
    await sendCodeEmail(email, code);
  } catch (cause) {
    /*
     * Said out loud, and said to the reader too.
     *
     * This is the one failure that must not be swallowed behind the neutral
     * reply above: the row exists, the code is real, and it is in nobody's
     * inbox. Someone left with "a code is on its way" would wait for an email
     * that was never sent. The log is for the cause — an unverified domain and
     * a bad key look identical from the outside — and the status is so the form
     * can say something true.
     */
    console.error("[auth] could not send a code:", cause);
    return NextResponse.json(
      { error: "The code could not be sent. Try again in a moment." },
      { status: 502 },
    );
  }

  return NextResponse.json(SENT);
}
