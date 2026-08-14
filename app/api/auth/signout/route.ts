import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/account/session";

/**
 * Sign out.
 *
 * A POST, not a GET. A link that signs you out is a link anyone can put in an
 * image tag on another site, and while being signed out is not the worst thing
 * that can be done to somebody, it is not theirs to do.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
