import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/chatbot/db/client";
import { SESSION_COOKIE, readSession } from "./session";

/**
 * Who is asking, checked against the database rather than against the cookie.
 *
 * The proxy already turned away anyone with no cookie at all, but that check is
 * optimistic by design — Next's own guidance is that a proxy is for redirects
 * and not for authorization, because it runs before the request reaches the
 * thing being protected and cannot see what that thing needs. This is the real
 * one, and it runs inside the protected layout.
 *
 * A valid signature is not enough. The account is re-read every time, so
 * deleting a row or dropping someone to read-only takes effect on their next
 * request rather than when their cookie happens to expire.
 */

export type Admin = {
  id: string;
  email: string;
  role: "owner" | "read_only";
};

export async function currentAdmin(): Promise<Admin | null> {
  const store = await cookies();
  const session = readSession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;

  const { data } = await db()
    .from("admin_users")
    .select("id, email, role")
    .ilike("email", session.email)
    .maybeSingle();

  if (!data) return null;
  return { id: data.id, email: data.email, role: data.role as Admin["role"] };
}

/** For a page that must not render at all without an account. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/**
 * Writes the audit row for an action.
 *
 * The email is copied in rather than joined, so the trail still names its
 * author after the account is deleted — a log that forgets who did something
 * when they leave is not a log.
 */
export async function recordAction(
  admin: Admin,
  action: string,
  target?: string,
  detail: Record<string, unknown> = {},
): Promise<void> {
  await db().from("audit_log").insert({
    admin_user_id: admin.id,
    actor_email: admin.email,
    action,
    target: target ?? null,
    detail,
  });
}
