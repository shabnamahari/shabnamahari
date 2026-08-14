/**
 * Proves the sign-in flow without sending an email.
 *
 *   npx tsx --conditions=react-server scripts/auth-smoke.ts
 *
 * Delivery is the one part that needs a provider key. Everything else — the
 * code being spent exactly once, an account being created, a wrong code being
 * refused, the attempt ceiling, the session cookie the server issues, and the
 * page behind it — can be exercised against a running dev server by seeding a
 * code with the same hasher the endpoint uses.
 *
 * It cleans up after itself. The address below is not a real mailbox and the
 * rows it makes are deleted at the end, so this can be run against the same
 * database as the site without leaving a fake account behind.
 */

import "./load-env";
import { db } from "@/lib/chatbot/db/client";
import { CODE_TTL_SECONDS, hashCode } from "@/lib/account/session";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const EMAIL = "auth-smoke@example.invalid";

let failures = 0;

function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

async function seedCode(code: string): Promise<void> {
  await db()
    .from("email_codes")
    .insert({
      email: EMAIL,
      code_hash: await hashCode(code),
      name: "Smoke Test",
      expires_at: new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString(),
    });
}

async function verify(code: string) {
  const res = await fetch(`${BASE}/api/auth/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, code }),
  });
  return { status: res.status, cookie: res.headers.get("set-cookie") ?? "" };
}

async function cleanup() {
  await db().from("email_codes").delete().eq("email", EMAIL);
  await db().from("accounts").delete().ilike("email", EMAIL);
}

async function main() {
  await cleanup();

  // A wrong code is refused, and does not create anything.
  await seedCode("123456");
  check("a wrong code is refused", (await verify("999999")).status === 400);

  const after = await db().from("accounts").select("id").ilike("email", EMAIL);
  check("no account is made by a failed attempt", (after.data ?? []).length === 0);

  // The right code signs in, creates the account, and sets a session.
  await cleanup();
  await seedCode("424242");
  const ok = await verify("424242");
  check("the right code is accepted", ok.status === 200, `status ${ok.status}`);
  check("a session cookie comes back", ok.cookie.includes("sc_user="));
  check("the cookie is httpOnly", /httponly/i.test(ok.cookie));

  const created = await db()
    .from("accounts")
    .select("id, name, email")
    .ilike("email", EMAIL)
    .maybeSingle();
  check("the account exists", !!created.data);
  check("it kept the name from the form", created.data?.name === "Smoke Test");

  // The same code a second time is dead.
  check("a spent code cannot be replayed", (await verify("424242")).status === 400);

  // The page behind the session renders for the holder and not for a stranger.
  const cookie = ok.cookie.split(";")[0];
  const mine = await fetch(`${BASE}/account`, { headers: { cookie } });
  const body = await mine.text();
  check("the account page renders for the session", mine.status === 200);
  check("and it names the account", body.includes("Smoke Test"), "greeting");

  const stranger = await fetch(`${BASE}/account`, { redirect: "manual" });
  check(
    "a stranger is turned away from the account page",
    stranger.status === 307 || stranger.status === 302,
    `status ${stranger.status}`,
  );

  // A forged cookie is not a session.
  const forged = await fetch(`${BASE}/account`, {
    headers: { cookie: "sc_user=not.a.real.token" },
    redirect: "manual",
  });
  check(
    "a forged cookie is turned away",
    forged.status === 307 || forged.status === 302,
    `status ${forged.status}`,
  );

  await cleanup();

  console.log(failures === 0 ? "\nall good" : `\n${failures} failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (cause) => {
  console.error(cause);
  await cleanup().catch(() => {});
  process.exit(1);
});
