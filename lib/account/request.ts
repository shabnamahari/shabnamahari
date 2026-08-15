import "server-only";

import { siteUrl } from "@/lib/site-url";

/**
 * Is this POST from our own page, or from somebody else's?
 *
 * The endpoints below set a session cookie, and a request that sets a session
 * cookie is a request worth being sure about. A form on another site can post
 * to ours: the browser sends it, the browser keeps the `Set-Cookie` that comes
 * back, and the visitor is now signed into an account chosen by whoever wrote
 * that form. Nothing is stolen — they are logged *in*, not out — but everything
 * they type next goes somewhere they did not choose.
 *
 * Two checks, and the first is the one that does the work. A cross-origin HTML
 * form can only send `application/x-www-form-urlencoded`, `multipart/form-data`
 * or `text/plain`; it cannot send `application/json`. Anything that *can* — a
 * `fetch` from a script — is subject to CORS, and there is no CORS header on
 * these routes to let it read or, for a non-simple content type, even send.
 * Requiring JSON therefore turns the whole class away.
 *
 * `Origin` is the belt to that pair of braces. Browsers put it on every POST,
 * so when it is present and names another site the request is refused outright.
 * It is not *required*, because a non-browser caller — curl, a test — has no
 * business being locked out of an endpoint that is public by design.
 */
export function fromOurOwnPage(request: Request): boolean {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  // Whatever host the request actually arrived on is the host to compare
  // against, with the configured address as the first authority. Both are
  // reduced to an origin so a path or a trailing slash cannot make them differ.
  const expected = siteUrl() || request.url;
  try {
    return new URL(origin).origin === new URL(expected).origin;
  } catch {
    return false;
  }
}
