import "server-only";

import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * The visitor's session cookie, and the hashing for their one-time codes.
 *
 * Built the same way as the panel's — Node's own crypto, an HMAC over a payload
 * that carries its own expiry — because the reasoning in `lib/admin/session.ts`
 * still holds and two mechanisms doing one job is worse than one doing it
 * twice. What is emphatically *not* shared is the key.
 *
 * A panel session and a visitor session are both `{ email, expiresAt }` signed
 * with AUTH_SECRET. Signed with the *same* key, they are the same token: a
 * valid `sc_admin` cookie would verify perfectly as an `sc_user` cookie, and
 * the reverse — anyone who signed up on the home page would hold a string that
 * the admin panel's verifier accepts. Nothing downstream would catch it,
 * because the signature really is valid; it was simply never meant for that
 * door.
 *
 * So each purpose gets its own key, derived from AUTH_SECRET by HMAC. The two
 * are unrelated to anything that can be computed without the secret, so a token
 * minted for one is not merely rejected by the other — it cannot be produced
 * for it. The admin module is left untouched: it keeps signing with the raw
 * secret, and this is the side that moves.
 */

const scryptAsync = promisify(scrypt);

/**
 * How long a visitor stays signed in.
 *
 * Far longer than the panel's twelve hours, and for the opposite reason. The
 * panel is Shabnam's whole business behind one password on a laptop that gets
 * left places; this is someone's own learning page, and making them fetch a
 * code from their email every day is how a sign-in becomes a reason not to come
 * back.
 *
 * Thirty days from the moment it is issued, and *not* refreshed on use — this
 * said "refreshed on use" and nothing refreshed it, which is worse than either
 * behaviour because it describes one and does the other. Sliding it would mean
 * re-issuing the cookie on requests that render pages, and a Server Component
 * cannot set one; it would have to move into the proxy and run a signature
 * check on every request in the site. Thirty flat is the honest version, and
 * the cost of being wrong is one email.
 */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export const SESSION_COOKIE = "sc_user";

/** How long a code is worth typing. Long enough to go and find the email. */
export const CODE_TTL_SECONDS = 10 * 60;

/** Guesses allowed against one code before it is dead. */
export const CODE_MAX_ATTEMPTS = 5;

function rootSecret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "AUTH_SECRET is not set, or is shorter than 32 characters. " +
        "Generate one with: openssl rand -base64 32",
    );
  }
  return value;
}

/**
 * A key for one purpose and no other.
 *
 * The label is the whole mechanism: change it and every token signed under the
 * old one stops verifying, which is exactly what should happen if these are
 * ever confused again.
 */
function keyFor(purpose: string): Buffer {
  return createHmac("sha256", rootSecret()).update(`sc:${purpose}`).digest();
}

// --- one-time codes --------------------------------------------------------

/**
 * Six digits, from the system's own randomness.
 *
 * `randomInt` rather than anything built on `Math.random`, which is seeded per
 * process and predictable to anyone who can watch a few outputs — a property
 * that does not matter for an animation delay and matters entirely here.
 */
export function newCode(): string {
  // randomBytes → a uniform value in [0, 1e6) without modulo bias: rejection
  // sampling on a 32-bit draw, which retries about 1 time in 5000.
  for (;;) {
    const draw = randomBytes(4).readUInt32BE(0);
    const limit = Math.floor(0xffffffff / 1_000_000) * 1_000_000;
    if (draw >= limit) continue;
    return String(draw % 1_000_000).padStart(6, "0");
  }
}

/** `scrypt$<salt hex>$<hash hex>` — the same format the admin password uses. */
export async function hashCode(code: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(code, salt, 64)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyCode(code: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  const derived = (await scryptAsync(
    code,
    Buffer.from(saltHex, "hex"),
    expected.length,
  )) as Buffer;

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

// --- the session cookie ----------------------------------------------------

type Session = { accountId: string; expiresAt: number };

function sign(payload: string, purpose: string): string {
  return createHmac("sha256", keyFor(purpose)).update(payload).digest("base64url");
}

/**
 * The account id rather than the email, which is the other difference from the
 * panel.
 *
 * The panel's subject is an address because that is what its one account is
 * identified by. Here an address is a thing people change, and a session that
 * names one would either survive the change and point at nobody, or have to be
 * revoked on every edit. The id is the account.
 */
export function issueSession(accountId: string): string {
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = Buffer.from(JSON.stringify({ accountId, expiresAt })).toString(
    "base64url",
  );
  return `${payload}.${sign(payload, "user")}`;
}

/**
 * The session in a cookie, or null.
 *
 * Null covers every failure in one shape, for the reason the panel's version
 * gives: a caller that has to tell "expired" from "forged" from "truncated" is
 * a caller with three ways to let one of them through.
 */
export function readSession(token: string | undefined): Session | null {
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload, "user"));
  const given = Buffer.from(signature);
  if (expected.length !== given.length) return null;
  if (!timingSafeEqual(expected, given)) return null;

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as Session;
    if (typeof session.accountId !== "string") return null;
    if (typeof session.expiresAt !== "number") return null;
    // From the signed payload, never the cookie's Max-Age: the browser owns
    // that one and can be told to keep it forever.
    if (session.expiresAt < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

// --- the OAuth state cookie ------------------------------------------------

/**
 * The value that ties a Google redirect back to the browser that started it.
 *
 * Its own purpose, so it is its own key: a state token is not a session and
 * must not be usable as one. Short-lived by construction — it carries an expiry
 * the same way, and a round trip through Google takes seconds, not minutes.
 */
export const OAUTH_STATE_COOKIE = "sc_oauth";

export const OAUTH_STATE_MAX_AGE = 10 * 60;

export function issueState(): string {
  const payload = Buffer.from(
    JSON.stringify({ nonce: randomBytes(16).toString("hex"), expiresAt: Date.now() + OAUTH_STATE_MAX_AGE * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload, "oauth")}`;
}

export function readState(token: string | undefined): boolean {
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = Buffer.from(sign(payload, "oauth"));
  const given = Buffer.from(signature);
  if (expected.length !== given.length) return false;
  if (!timingSafeEqual(expected, given)) return false;

  try {
    const state = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      expiresAt: number;
    };
    return typeof state.expiresAt === "number" && state.expiresAt > Date.now();
  } catch {
    return false;
  }
}
