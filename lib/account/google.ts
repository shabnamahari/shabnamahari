import "server-only";

import { siteUrl } from "@/lib/site-url";

/**
 * The two things both halves of the Google flow have to agree on.
 *
 * The redirect URI is checked by Google against a list typed into the Cloud
 * console, character for character. It is sent twice — once when the visitor is
 * handed over and once when the code is exchanged — and if those two disagree
 * by so much as a trailing slash the exchange fails with `redirect_uri_mismatch`
 * and nothing says which of the three copies is the odd one out. So there is
 * one copy, here.
 */
export function googleRedirectUri(): string {
  // `siteUrl` rather than `reachableSiteUrl`: localhost is exactly right here.
  // Google permits http://localhost redirect URIs precisely so this flow can be
  // developed, and the "is this reachable from someone else's phone" question
  // that the other helper answers is not this question.
  const base = siteUrl() || "http://localhost:3000";
  return `${base}/api/auth/google/callback`;
}

export type GoogleIdentity = {
  /** Google's stable subject id. Never reassigned, unlike the address. */
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
};

/**
 * Trade the one-time code for who this is.
 *
 * The token endpoint is called server to server with the client secret, so its
 * answer is authenticated by that exchange — this is why the id token's
 * signature is not verified here. Verification matters when a token arrives
 * from somewhere untrusted, such as a browser; a response fetched over TLS from
 * Google's own endpoint, using a secret only this server holds, cannot have
 * come from anywhere else.
 *
 * The claims are then read from the userinfo endpoint rather than by decoding
 * that token, which keeps this module free of JWT parsing for no loss: it is
 * one more request against an endpoint that is already being talked to.
 */
export async function exchangeGoogleCode(code: string): Promise<GoogleIdentity> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set.");
  }

  const token = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!token.ok) {
    const detail = await token.text().catch(() => "");
    // The detail is kept because `redirect_uri_mismatch` and `invalid_client`
    // are different mistakes in different places, and "sign-in failed" sends
    // whoever is debugging it to look in the wrong one.
    throw new Error(`Google refused the code (${token.status}): ${detail}`);
  }

  const { access_token: accessToken } = (await token.json()) as {
    access_token?: string;
  };
  if (!accessToken) throw new Error("Google returned no access token.");

  const info = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!info.ok) throw new Error(`Google userinfo failed (${info.status}).`);

  const claims = (await info.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };

  if (!claims.sub || !claims.email) {
    throw new Error("Google returned no subject or address.");
  }

  return {
    sub: claims.sub,
    email: claims.email.toLowerCase(),
    emailVerified: claims.email_verified === true,
    name: claims.name?.trim() || null,
  };
}
