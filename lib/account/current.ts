import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/chatbot/db/client";
import { SESSION_COOKIE, readSession } from "./session";

/**
 * Who is signed in, checked against the database rather than against the cookie.
 *
 * The same rule the panel follows and for the same reason: a valid signature
 * says the token was minted here, not that the account still exists. It is
 * re-read on every request, so deleting a row takes effect on the next page
 * rather than whenever a thirty-day cookie happens to lapse.
 */

export type Account = {
  id: string;
  email: string;
  name: string | null;
};

export async function currentAccount(): Promise<Account | null> {
  const store = await cookies();
  const session = readSession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;

  const { data } = await db()
    .from("accounts")
    .select("id, email, name")
    .eq("id", session.accountId)
    .maybeSingle();

  if (!data) return null;
  return { id: data.id, email: data.email, name: data.name };
}

/** For a page that must not render at all without an account. */
export async function requireAccount(): Promise<Account> {
  const account = await currentAccount();
  // Home, because that is where the sign-in bar is. There is no separate
  // sign-in page to send anyone to, and inventing one would mean two doors.
  if (!account) redirect("/");
  return account;
}
