import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Panel — Shabnam Ahari",
  // The panel is not a page anyone should arrive at from a search.
  robots: { index: false, follow: false },
};

/**
 * The panel's own ground, deliberately not the site's.
 *
 * No Lenis, no custom cursor, no lightbox, no assistant floating over it. The
 * marketing chrome lives in `(site)` for exactly this reason: smooth scroll
 * fights a long table, and `cursor: none` in a place where you are editing what
 * the bot will say to people is a joke at the operator's expense.
 */
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // `data-surface` is what gives the system cursor back. globals.css hides it
  // for the whole document because the site draws its own, and that component
  // is mounted in `(site)` only — so without this attribute the panel is a
  // screen full of fields you cannot see yourself click.
  return (
    <div data-surface="panel" className="bg-paper text-ink min-h-screen">
      {children}
    </div>
  );
}
