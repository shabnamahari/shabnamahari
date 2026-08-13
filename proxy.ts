import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/admin/session";

/**
 * One optimistic check: does this request carry a session cookie at all?
 *
 * Deliberately no more than that. Next's own guidance is that a proxy is for
 * redirects and not for authorization — it runs before the request reaches what
 * it is protecting, and a proxy that verifies a signature and waves the request
 * through has moved the decision to the wrong place. So this only saves an
 * unauthenticated visitor a round trip; `requireAdmin()` in the admin layout is
 * what actually decides, against the database, on every request.
 *
 * It follows that a forged cookie passes here. That is fine and expected: it
 * fails a few milliseconds later, where the account is read.
 *
 * Formerly `middleware.ts`. Renamed in Next 16, same behaviour — and its
 * runtime is Node only and not configurable, which is what lets it import the
 * cookie name from a module that is otherwise server-only.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The login page is the destination of this redirect. Protecting it would
  // send it to itself.
  if (pathname.startsWith("/admin/login")) return NextResponse.next();

  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const login = new URL("/admin/login", request.url);
  // So signing in lands where they were going, rather than at the front door.
  if (pathname !== "/admin") login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: "/admin/:path*",
};
