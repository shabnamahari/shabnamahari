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

/*
 * A fresh caller identity per run.
 *
 * The verify route buckets its rate limit by `x-forwarded-for`, so two runs
 * inside fifteen minutes shared one bucket: the second was throttled, every
 * check that expected a refusal got a 429 instead, and the suite failed while
 * the code under it was perfectly correct. A test that cannot be run twice is
 * a test that gets ignored the second time.
 *
 * Random rather than fixed, so parallel runs do not collide either. The limiter
 * is still exercised — deliberately, at the end.
 */
const CALLER = `203.0.113.${Math.floor(Math.random() * 254) + 1}`;

const JSON_HEADERS = {
  "content-type": "application/json",
  "x-forwarded-for": CALLER,
} as const;

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
    headers: JSON_HEADERS,
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
  const mine = await fetch(`${BASE}/myaccount`, { headers: { cookie } });
  const body = await mine.text();
  check("the account page renders for the session", mine.status === 200);
  check("and it names the account", body.includes("Smoke Test"), "greeting");

  const stranger = await fetch(`${BASE}/myaccount`, { redirect: "manual" });
  check(
    "a stranger is turned away from the account page",
    stranger.status === 307 || stranger.status === 302,
    `status ${stranger.status}`,
  );

  /*
   * The wildcard takeover, which is the reason this file grew.
   *
   * `.ilike("email", …)` passed the caller's address to PostgREST as a LIKE
   * pattern, so `_` matched any character: proving `a_smoke@example.invalid`
   * handed you the account belonging to `a.smoke@example.invalid`. The victim
   * is created first, then a code is proved against the pattern address.
   */
  const VICTIM = "a.smoke@example.invalid";
  const PATTERN = "a_smoke@example.invalid";
  await db().from("accounts").delete().in("email", [VICTIM, PATTERN]);
  await db().from("email_codes").delete().in("email", [VICTIM, PATTERN]);

  const victim = await db()
    .from("accounts")
    .insert({ email: VICTIM, name: "Victim" })
    .select("id")
    .single();

  await db().from("email_codes").insert({
    email: PATTERN,
    code_hash: await hashCode("555555"),
    name: "Attacker",
    expires_at: new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString(),
  });

  const attack = await fetch(`${BASE}/api/auth/verify`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ email: PATTERN, code: "555555" }),
  });
  const attackCookie = attack.headers.get("set-cookie") ?? "";
  const landed = await fetch(`${BASE}/myaccount`, {
    headers: { cookie: attackCookie.split(";")[0] },
  });
  const landedBody = await landed.text();

  check(
    "an underscore address cannot reach the dotted account",
    !landedBody.includes("Victim"),
    landedBody.includes("Victim") ? "TOOK OVER THE VICTIM" : "got its own account",
  );
  check(
    "and the victim's row is untouched",
    (
      await db().from("accounts").select("name").eq("id", victim.data!.id).single()
    ).data?.name === "Victim",
  );

  await db().from("accounts").delete().in("email", [VICTIM, PATTERN]);
  await db().from("email_codes").delete().in("email", [VICTIM, PATTERN]);

  // A cross-site form post cannot mint a session: it cannot send JSON.
  await cleanup();
  await seedCode("313131");
  const crossSite = await fetch(`${BASE}/api/auth/verify`, {
    method: "POST",
    headers: { "content-type": "text/plain", "x-forwarded-for": CALLER },
    body: JSON.stringify({ email: EMAIL, code: "313131" }),
  });
  check(
    "a non-JSON post is refused before anything happens",
    crossSite.status === 403,
    `status ${crossSite.status}`,
  );
  check(
    "and it hands back no session",
    !(crossSite.headers.get("set-cookie") ?? "").includes("sc_user="),
  );

  // The guess ceiling holds even when the guesses arrive together.
  await cleanup();
  await seedCode("909090");
  const burst = await Promise.all(
    Array.from({ length: 12 }, () => verify("111111")),
  );
  check(
    "a burst of wrong guesses is all refused",
    burst.every((r) => r.status === 400),
  );
  const spentRow = await db()
    .from("email_codes")
    .select("attempts")
    .eq("email", EMAIL)
    .maybeSingle();
  check(
    "and the code stops accepting guesses at the ceiling",
    (spentRow.data?.attempts ?? 0) <= 5,
    `attempts reached ${spentRow.data?.attempts}`,
  );
  check(
    "so even the right code is dead afterwards",
    (await verify("909090")).status === 400,
  );

  /*
   * The caller ceiling, asserted last because it spends this run's whole budget.
   *
   * The per-code ceiling above stops five guesses at one code. This is the one
   * that stops a script asking for a fresh code every time it burns one, and it
   * is the only reason the six-digit space is not walkable.
   */
  await cleanup();
  let sawLimit = false;
  for (let i = 0; i < 30 && !sawLimit; i++) {
    if ((await verify("000000")).status === 429) sawLimit = true;
  }
  check("the caller is eventually rate limited", sawLimit);

  // A forged cookie is not a session.
  const forged = await fetch(`${BASE}/myaccount`, {
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
