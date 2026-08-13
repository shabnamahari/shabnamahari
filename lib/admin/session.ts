import "server-only";

import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * The panel's session cookie and password hashing, on Node's own crypto.
 *
 * No auth library. This area has exactly one account, no third-party provider,
 * no SMTP to send a magic link through, and no sign-up flow — the whole surface
 * is "is this Shabnam, and is her session still valid". A dependency that
 * exists to abstract over providers we do not have would be more code to trust,
 * not less.
 *
 * What that buys has to be paid for in care, so: scrypt for the password with a
 * per-password salt, HMAC-SHA256 over the payload for the cookie, constant-time
 * comparison on both, and an expiry inside the signed payload rather than
 * trusted from the cookie's own Max-Age — a cookie's lifetime is a hint to the
 * browser and is not evidence of anything.
 */

const scryptAsync = promisify(scrypt);

/** How long a sign-in lasts. Short enough that a forgotten laptop expires. */
export const SESSION_MAX_AGE = 60 * 60 * 12;

export const SESSION_COOKIE = "sc_admin";

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "AUTH_SECRET is not set, or is shorter than 32 characters. " +
        "Generate one with: openssl rand -base64 32",
    );
  }
  return value;
}

// --- passwords -------------------------------------------------------------

/** `scrypt$<salt hex>$<hash hex>`, so the format carries its own parameters. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  const derived = (await scryptAsync(
    password,
    Buffer.from(saltHex, "hex"),
    expected.length,
  )) as Buffer;

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

// --- the session cookie ----------------------------------------------------

type Session = { email: string; expiresAt: number };

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function issueSession(email: string): string {
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = Buffer.from(JSON.stringify({ email, expiresAt })).toString(
    "base64url",
  );
  return `${payload}.${sign(payload)}`;
}

/**
 * The session in a cookie, or null.
 *
 * Null covers every failure in one shape on purpose: a caller that has to tell
 * "expired" from "forged" from "truncated" is a caller with three ways to let
 * one of them through.
 */
export function readSession(token: string | undefined): Session | null {
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length) return null;
  if (!timingSafeEqual(expected, given)) return null;

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as Session;
    if (typeof session.email !== "string") return null;
    if (typeof session.expiresAt !== "number") return null;
    // Read from the signed payload, never from the cookie's Max-Age: the
    // browser owns that one and can be told to keep it forever.
    if (session.expiresAt < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}
