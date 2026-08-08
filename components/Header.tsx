"use client";

import { usePathname } from "next/navigation";

/**
 * Where Menu is bracketed. It is a pair with that page's ( Back ), which is the
 * only reason the gesture exists; everywhere else the word is left alone.
 */
const BRACKETED_ON = "/auth";

export default function Header({
  isMenuOpen,
  onToggleMenu,
}: {
  isMenuOpen: boolean;
  onToggleMenu: () => void;
}) {
  const isBracketed = usePathname() === BRACKETED_ON;
  const label = isMenuOpen ? "Close" : "Menu";

  return (
    // Menu toggle only — the small wordmark that used to sit on the left
    // collided with the footer's "( Menu )" label at the bottom of the page.
    <div className="fixed top-0 left-0 z-[999999999] flex w-full items-center justify-end p-[15px] text-white mix-blend-difference">
      <button
        type="button"
        onClick={onToggleMenu}
        className="group text-sm font-semibold tracking-wide uppercase"
      >
        {isBracketed ? (
          <>
            {/*
             * The brackets are the site's own mark for a thing you can act on
             * — the hero media sits in them, so does ( in production ), so
             * does the footer's ( Menu ). Here they arrive on hover, opening
             * around the word as Back's close onto it.
             *
             * They hold their width at rest and only fade and slide, so the
             * word never moves and the fixed bar never reflows under the
             * pointer.
             */}
            <span className="ease-custom-less inline-block -translate-x-[0.35em] opacity-0 transition-all duration-700 group-hover:translate-x-0 group-hover:opacity-100">
              (
            </span>
            <span className="px-[0.35em]">{label}</span>
            <span className="ease-custom-less inline-block translate-x-[0.35em] opacity-0 transition-all duration-700 group-hover:translate-x-0 group-hover:opacity-100">
              )
            </span>
          </>
        ) : (
          label
        )}
      </button>
    </div>
  );
}
