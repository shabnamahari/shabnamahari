import { NextResponse } from "next/server";

import { db } from "@/lib/chatbot/db/client";
import { exchangeGoogleCode } from "@/lib/account/google";
import { siteUrl } from "@/lib/site-url";
import {
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  issueSession,
  readState,
} from "@/lib/account/session";

/**
 * Google sends them back here.
 *
 * Everything this route does is conditional on the state check below, which is
 * why it comes before the code is so much as looked at.
 */

/**
 * Where to send someone, on this deployment.
 *
 * `NextResponse.redirect` needs an absolute URL, so a base has to come from
 * somewhere. It was `NEXT_PUBLIC_SITE_URL` with a hardcoded localhost fallback,
 * which is a trap: that variable is optional, and unset on a deployment it
 * would have sent every visitor who signed in with Google to a machine only the
 * developer has. `siteUrl()` already knows to fall back to the deployment's own
 * domain, and the incoming request is the last word — whatever host this was
 * actually reached on is a host that works.
 */
function landing(path: string, request: Request): URL {
  return new URL(path, siteUrl() || request.url);
}

/**
 * Somewhere to land when this cannot be completed, saying so without detail.
 *
 * The state cookie is cleared here as well as on success. It was cleared only
 * on the happy path, which left it valid for its full ten minutes after every
 * failure — a spent-but-still-good state is exactly what the pairing exists to
 * prevent, so leaving one behind on the error path contradicted the whole
 * mechanism.
 */
function refuse(reason: string, request: Request): NextResponse {
  const url = landing("/", request);
  url.searchParams.set("auth", reason);
  const response = NextResponse.redirect(url);
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  // Someone who pressed "cancel" on Google's screen. Not an error, and not
  // worth a message: they are simply back where they started.
  if (params.get("error")) return refuse("cancelled", request);

  const code = params.get("code");
  const state = params.get("state");

  /*
   * Both halves, and they must match each other as well as verify.
   *
   * Checking the signature alone would accept any state this server ever
   * minted, including one minted for a different browser. The cookie is what
   * ties this particular redirect to the person who started it.
   */
  const cookieState = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${OAUTH_STATE_COOKIE}=`))
    ?.slice(OAUTH_STATE_COOKIE.length + 1);

  if (!code || !state || !cookieState || state !== cookieState || !readState(state)) {
    return refuse("failed", request);
  }

  let identity;
  try {
    identity = await exchangeGoogleCode(code);
  } catch (cause) {
    console.error("[auth] google exchange failed:", cause);
    return refuse("failed", request);
  }

  /*
   * An unverified address is refused.
   *
   * Google will hand over an address it has not confirmed, and treating one as
   * proof would undo the entire point of the email code sitting next to this:
   * anyone able to claim an address on a Google Workspace domain could take
   * over the account belonging to it here.
   */
  if (!identity.emailVerified) return refuse("unverified", request);

  /*
   * The subject first, then the address.
   *
   * Someone who signed up by email and later presses Google arrives with a
   * `sub` nothing has seen and an address that already has an account — they
   * are the same person and should land in the same account, so the address
   * matches and the subject is written onto it. Matching on address *alone*
   * would be the hole: it is the subject that is never reassigned, so once an
   * account has one, that is the thing that identifies it.
   */
  const bySub = await db()
    .from("accounts")
    .select("id")
    .eq("google_sub", identity.sub)
    .maybeSingle();

  let accountId: string;

  if (bySub.data) {
    accountId = bySub.data.id;
    await db()
      .from("accounts")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", accountId);
  } else {
    /*
     * `eq`, never `ilike`.
     *
     * PostgREST passes `ilike` to SQL as a LIKE pattern, where `_` matches any
     * character — so a Workspace address like `john_smith@corp.com` would have
     * matched, and claimed, the account belonging to `john.smith@corp.com`.
     * Both sides are lowercased already; an exact match is all this needed.
     */
    const byEmail = await db()
      .from("accounts")
      .select("id, name, google_sub")
      .eq("email", identity.email)
      .maybeSingle();

    if (byEmail.error) {
      console.error("[auth] could not read the account:", byEmail.error);
      return refuse("failed", request);
    }

    if (byEmail.data) {
      /*
       * An account that already belongs to a *different* Google subject is not
       * this person's, whatever the address says.
       *
       * The old code kept the stored subject and signed the caller in anyway,
       * which is the takeover the comment above warns about, written out in
       * full: a Workspace address released and reissued to somebody else
       * arrives here with a new `sub`, matches on address, and is handed the
       * previous holder's account. Refusing is the only safe answer, and it is
       * a case that cannot happen by accident — one address, two Google
       * identities, means the address changed hands.
       */
      if (byEmail.data.google_sub && byEmail.data.google_sub !== identity.sub) {
        console.warn(
          "[auth] refused a Google sign-in: the address is already held by another subject",
        );
        return refuse("mismatch", request);
      }

      // An account under this address that Google has never been linked to.
      // Claim it — the address is proven on both sides.
      accountId = byEmail.data.id;
      await db()
        .from("accounts")
        .update({
          google_sub: identity.sub,
          last_seen_at: new Date().toISOString(),
          ...(byEmail.data.name ? {} : identity.name ? { name: identity.name } : {}),
        })
        .eq("id", accountId);
    } else {
      const created = await db()
        .from("accounts")
        .insert({
          email: identity.email,
          name: identity.name,
          google_sub: identity.sub,
        })
        .select("id")
        .single();

      if (created.error || !created.data) {
        console.error("[auth] could not create an account:", created.error);
        return refuse("failed", request);
      }
      accountId = created.data.id;
    }
  }

  const response = NextResponse.redirect(landing("/myaccount", request));
  response.cookies.set(SESSION_COOKIE, issueSession(accountId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  // Spent. Leaving it would let the same redirect be replayed inside its ten
  // minutes.
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}
