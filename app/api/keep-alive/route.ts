import { timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

import { db } from "@/lib/chatbot/db/client";

/**
 * One small read, twice a week, so Supabase does not pause the project.
 *
 * A free Supabase project is paused after seven days with no activity, and
 * waking it is a manual click in a dashboard — which means the first person to
 * notice would be a learner whose chat never answers. This route exists to make
 * sure that week never elapses. Nothing here is about the site's behaviour; it
 * is a heartbeat and no more.
 *
 * What counts as activity is a query reaching Postgres, not a page loading, so
 * the work has to be a real read against a real table. `settings` is the
 * smallest one that is always populated — 0008 seeds it and the panel keeps it
 * that way — and a single key from a single row is the least that can be asked
 * of it. No table was created for this: a table whose only purpose is to be
 * read by the thing that keeps the database awake is a table that has to be
 * migrated, backed up and explained forever.
 *
 * The URL is public and guessable, so `CRON_SECRET` is what makes a request
 * actually be the cron. The schedule lives in vercel.json at the repo root,
 * which is JSON and so cannot say any of this itself.
 */

export const dynamic = "force-dynamic";

/**
 * Named once. If this table is ever dropped, the failure should read as "the
 * keep-alive is pointed at a table that no longer exists" rather than as a
 * database that has gone away.
 */
const TABLE = "settings";

function matches(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Two ways in, for two callers.
 *
 * Vercel sends `Authorization: Bearer $CRON_SECRET` on a cron invocation, and
 * that is the path that runs on a schedule. The `?key=` fallback is for
 * Shabnam checking it herself in a browser, where a header cannot be set — it
 * is the only reason this route returns anything readable at all. It puts the
 * secret in browser history and in Vercel's request logs, which is an accepted
 * cost here and would not be for a secret that guarded anything: the worst a
 * leaked one buys is the right to keep the database awake.
 */
function authorised(request: NextRequest, secret: string): boolean {
  const header = request.headers.get("authorization");
  if (header) return matches(header, `Bearer ${secret}`);

  const key = new URL(request.url).searchParams.get("key");
  return key !== null && matches(key, secret);
}

export async function GET(request: NextRequest): Promise<Response> {
  // Said out loud rather than answered with a bare 401. An unset variable and a
  // wrong one fail identically from the outside, and the whole point of a job
  // that runs unattended is that nobody is watching to tell them apart. This
  // names the variable and never the value.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      {
        ok: false,
        error:
          "CRON_SECRET is not set on this deployment. Set it in the Vercel " +
          "project's environment variables and redeploy.",
      },
      { status: 503 },
    );
  }

  if (!authorised(request, secret)) {
    return Response.json({ ok: false, error: "unauthorised" }, { status: 401 });
  }

  const startedAt = Date.now();
  const checkedAt = new Date().toISOString();

  let result;
  try {
    result = await db().from(TABLE).select("key").limit(1);
  } catch (error) {
    // A throw rather than an error field means the client never got as far as
    // a query — an unset SUPABASE_URL, a network that refused. Reported the
    // same shape as a failed query, because from here they are the same news.
    return Response.json(
      {
        ok: false,
        table: TABLE,
        error: error instanceof Error ? error.message : String(error),
        ms: Date.now() - startedAt,
        checkedAt,
      },
      { status: 503 },
    );
  }

  if (result.error) {
    return Response.json(
      {
        ok: false,
        table: TABLE,
        error: result.error.message,
        ms: Date.now() - startedAt,
        checkedAt,
      },
      { status: 503 },
    );
  }

  // `rows` is reported, not required. What keeps the project awake is that
  // Postgres answered; an empty table would be a surprise worth seeing, not a
  // reason to call the heartbeat failed.
  return Response.json(
    {
      ok: true,
      table: TABLE,
      rows: result.data?.length ?? 0,
      ms: Date.now() - startedAt,
      checkedAt,
    },
    { status: 200 },
  );
}
