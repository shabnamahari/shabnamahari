/**
 * The site's own address, for links that leave the site.
 *
 * A handoff notification arrives in Telegram, so the link in it has to be
 * absolute — a path is unreachable from there.
 *
 * Two rules, and the second was learned the hard way. Shabnam's first real
 * notification arrived reading `http://localhost:3000/admin/conversations/…`,
 * because the handoff that produced it was triggered from a laptop, where
 * `NEXT_PUBLIC_SITE_URL` is localhost and correct. It is correct for a link on
 * the page. It is never correct for a link on somebody's phone, and Telegram
 * would not even underline it — a loopback address is not a place, so it
 * arrived as dead grey text.
 *
 * So: a loopback address is treated as no address at all. `reachableSiteUrl()`
 * returns "" there, and the caller sends the message without a link rather than
 * with one that goes nowhere.
 *
 * `VERCEL_PROJECT_PRODUCTION_URL` rather than `VERCEL_URL`: the latter names
 * one deployment, which is right for about a minute and then points at a build
 * nobody is using. The former is the project's production domain, and it
 * becomes the custom domain on the day there is one.
 */

const LOOPBACK = /^https?:\/\/(localhost|127\.0\.0\.1|\[?::1\]?|0\.0\.0\.0)(:\d+)?$/i;

/** Whatever this deployment believes its address to be, loopback included. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ??
    process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "";
}

/**
 * The same address, but only when it means something to someone elsewhere.
 *
 * Use this for anything that ends up outside the browser that made the request
 * — a Telegram message, an email. Returns "" when the best we have is a machine
 * only this process can reach.
 */
export function reachableSiteUrl(): string {
  const url = siteUrl();
  if (!url || LOOPBACK.test(url)) {
    // Fall through to the deployment's own domain when there is one: a local
    // dev server has none, but a preview build with NEXT_PUBLIC_SITE_URL set to
    // localhost by mistake still has somewhere real to point at.
    const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
    return vercel ? `https://${vercel.replace(/\/$/, "")}` : "";
  }
  return url;
}
