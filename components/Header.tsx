"use client";

import Link from "next/link";

export default function Header({
  isMenuOpen,
  onToggleMenu,
}: {
  isMenuOpen: boolean;
  onToggleMenu: () => void;
}) {
  return (
    <div className="fixed top-0 left-0 z-[999999999] flex w-full items-center justify-between p-[15px] text-white mix-blend-difference">
      <Link href="/" aria-label="Adcker" className="block max-w-[70px]">
        <span className="font-kumbh text-sm font-bold tracking-tight lowercase">
          adcker
        </span>
      </Link>
      <button
        type="button"
        onClick={onToggleMenu}
        className="text-sm font-semibold uppercase tracking-wide"
      >
        {isMenuOpen ? "Close" : "Menu"}
      </button>
    </div>
  );
}
