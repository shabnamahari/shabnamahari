/**
 * The site's own address, for links that leave the site.
 *
 * A handoff notification arrives in Telegram, so the link in it has to be
 * absolute — a path is unreachable from there. Production has no
 * `NEXT_PUBLIC_SITE_URL` set (checked against /api/health), and asking for one
 * more variable to be pasted into a dashboard is one more thing to get wrong,
 * so Vercel's own is used first.
 *
 * `VERCEL_PROJECT_PRODUCTION_URL` rather than `VERCEL_URL`: the latter is the
 * address of one deployment, which is correct for about a minute and then names
 * a build nobody is using. The former is the project's production domain, and
 * it becomes the custom domain on the day there is one.
 *
 * Returns "" rather than a guess when there is nothing to go on. A link to
 * localhost sent to somebody's phone is worse than no link.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ??
    process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "";
}
