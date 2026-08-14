import "server-only";

import { db } from "@/lib/chatbot/db/client";

/**
 * How often one person may ask, and how often one address may.
 *
 * Two windows rather than one. A single hourly cap lets someone spend the whole
 * allowance in four seconds, which is the shape an abusive script has; a single
 * per-minute cap lets them run all day at just under it. Together they permit a
 * fast exchange and refuse a sustained one.
 *
 * The numbers are set against a real conversation rather than a theoretical
 * one: somebody deciding whether to start a course asks perhaps five to fifteen
 * questions, occasionally two in quick succession when they think of a follow
 * up. Nothing here should ever be felt by that person.
 *
 * The address limit is looser than the person limit and exists for a different
 * reason — a cleared cookie is a new person, so the cookie alone stops nothing.
 * It is loose because an office, a university or a phone network is one address
 * shared by many people, and refusing them all is worse than paying for a few
 * extra answers.
 */
export const LIMITS = {
  person: [
    { seconds: 60, max: 6 },
    { seconds: 3600, max: 40 },
  ],
  address: [
    { seconds: 60, max: 20 },
    { seconds: 3600, max: 120 },
  ],
} as const;

type Window = { seconds: number; max: number };

async function withinWindow(bucket: string, window: Window): Promise<boolean> {
  const { data, error } = await db().rpc("check_rate_limit", {
    p_bucket: bucket,
    p_window_seconds: window.seconds,
    p_limit: window.max,
  });

  // A limiter that cannot reach the database lets the request through. The
  // alternative is an outage in one table taking the whole assistant down, and
  // the thing being protected here is a bill rather than a secret.
  if (error) {
    console.warn("[rate-limit] check failed, allowing:", error.message);
    return true;
  }

  return data !== false;
}

/**
 * Whether this turn may proceed.
 *
 * `identity` is who they are as far as the channel can tell — a cookie, a
 * Telegram chat id. `address` is the IP, and is optional because Telegram does
 * not have one worth counting: its updates all arrive from Telegram's servers,
 * so every chat would share one address and the first busy conversation would
 * lock out everybody else.
 */
export async function allowTurn(
  identity: string,
  address?: string,
): Promise<boolean> {
  for (const window of LIMITS.person) {
    if (!(await withinWindow(`id:${identity}`, window))) return false;
  }

  if (address) {
    for (const window of LIMITS.address) {
      if (!(await withinWindow(`ip:${address}`, window))) return false;
    }
  }

  return true;
}

/**
 * The caller's address, as far as it can be known behind a proxy.
 *
 * The first entry in `x-forwarded-for` is the client; everything after it is
 * the chain of proxies. On Vercel this header is set by the platform, so it
 * cannot be spoofed by the caller — off Vercel it can, which is worth knowing
 * before this is relied on anywhere else.
 */
export function callerAddress(headers: Headers): string | undefined {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || headers.get("x-real-ip") || undefined;
}
