"use client";

import Link from "next/link";
import { BACK_KEY, type BackOrigin } from "./BackControl";

/**
 * The link to /auth, which records where it was pressed from.
 *
 * document.referrer would have been simpler and is wrong here: a client-side
 * navigation does not set it, so it would name whatever page opened the tab.
 * A query parameter would have worked but puts the plumbing in the URL bar.
 */
export default function AuthLink({
  from,
  className,
  children,
}: {
  from: BackOrigin;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href="/auth"
      className={className}
      onClick={() => {
        try {
          sessionStorage.setItem(BACK_KEY, JSON.stringify(from));
        } catch {
          // Private mode and full stores are survivable: BackControl falls
          // back to history when it finds nothing.
        }
      }}
    >
      {children}
    </Link>
  );
}
