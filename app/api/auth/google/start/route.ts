import { NextResponse } from "next/server";

import {
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_MAX_AGE,
  issueState,
} from "@/lib/account/session";
import { googleRedirectUri } from "@/lib/account/google";

/**
 * Hand the visitor to Google.
 *
 * A GET rather than a POST because it is a navigation: pressing "continue with
 * google" should leave this site, and a form post that then redirects would put
 * an extra entry in the back button for no reason.
 *
 * The state parameter is the only thing standing between this and having
 * somebody else's Google account attached to a session in this browser. It is
 * minted here, signed, and set as a cookie; the callback accepts nothing that
 * does not carry both halves. Without it, a request forged to the callback with
 * an attacker's code would sign this browser into the attacker's account —
 * quietly, and with everything typed afterwards going into it.
 */
export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Google sign-in is not configured." },
      { status: 503 },
    );
  }

  const state = issueState();

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", googleRedirectUri());
  url.searchParams.set("response_type", "code");
  // The address and the name, and nothing else. Every additional scope is
  // something to justify on the consent screen and something to be trusted
  // with afterwards.
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  // No refresh token wanted: this is a sign-in, not an integration. Nothing
  // here ever calls Google again on someone's behalf.
  url.searchParams.set("access_type", "online");

  const response = NextResponse.redirect(url.toString());
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OAUTH_STATE_MAX_AGE,
  });
  return response;
}
