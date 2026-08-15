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

/** Somewhere to land when this cannot be completed, saying so without detail. */
function refuse(reason: string, request: Request): NextResponse {
  const url = landing("/", request);
  url.searchParams.set("auth", reason);
  return NextResponse.redirect(url);
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
    const byEmail = await db()
      .from("accounts")
      .select("id, name, google_sub")
      .ilike("email", identity.email)
      .maybeSingle();

    if (byEmail.data) {
      // An account under this address that Google has never been linked to.
      // Claim it — the address is proven on both sides.
      accountId = byEmail.data.id;
      await db()
        .from("accounts")
        .update({
          google_sub: byEmail.data.google_sub ?? identity.sub,
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

  const response = NextResponse.redirect(landing("/account", request));
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
