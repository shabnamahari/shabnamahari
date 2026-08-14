import type { NextRequest } from "next/server";

import { db } from "@/lib/chatbot/db/client";
import { allowLogin, callerAddress } from "@/lib/chatbot/core/rate-limit";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  issueSession,
  verifyPassword,
} from "@/lib/admin/session";

/**
 * Signing in, and signing out.
 *
 * The failure message is the same whether the email is unknown, the account has
 * no password yet, or the password is wrong. Telling those apart is a way of
 * asking this endpoint which addresses have accounts, and the answer to that
 * question is nobody's business.
 *
 * The work is deliberately not skipped when the account does not exist: scrypt
 * runs either way, against a throwaway hash, so the time taken says nothing
 * about whether the address is real.
 */

export const dynamic = "force-dynamic";

/** Any valid stored hash. Compared against when there is no account to compare. */
const DECOY =
  "scrypt$00000000000000000000000000000000$" + "0".repeat(128);

const FAILED = Response.json(
  { error: "Those details did not match." },
  { status: 401 },
);

export async function POST(request: NextRequest): Promise<Response> {
  let body: { email?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return FAILED;

  // Answered exactly as a wrong password is, so this still says nothing about
  // which addresses have accounts — including to somebody probing for the
  // limit itself.
  if (!(await allowLogin(callerAddress(request.headers), email))) return FAILED;

  const { data } = await db()
    .from("admin_users")
    .select("id, email, password_hash")
    .ilike("email", email)
    .maybeSingle();

  const ok = await verifyPassword(password, data?.password_hash ?? DECOY);
  if (!ok || !data?.password_hash) return FAILED;

  await db()
    .from("admin_users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", data.id);

  const response = Response.json({ ok: true });
  response.headers.append(
    "set-cookie",
    cookie(issueSession(data.email), SESSION_MAX_AGE),
  );
  return response;
}

export async function DELETE(): Promise<Response> {
  const response = Response.json({ ok: true });
  response.headers.append("set-cookie", cookie("", 0));
  return response;
}

function cookie(value: string, maxAge: number): string {
  return [
    `${SESSION_COOKIE}=${value}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    // Strict rather than Lax: nothing links into the panel from anywhere else,
    // so there is no navigation this would break, and it closes the class of
    // attack where another site causes a request that arrives already signed in.
    "SameSite=Strict",
    process.env.NODE_ENV === "production" ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}
