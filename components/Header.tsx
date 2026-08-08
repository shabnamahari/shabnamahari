"use client";

export default function Header({
  isMenuOpen,
  onToggleMenu,
}: {
  isMenuOpen: boolean;
  onToggleMenu: () => void;
}) {
  return (
    // Menu toggle only — the small wordmark that used to sit on the left
    // collided with the footer's "( Menu )" label at the bottom of the page.
    <div className="fixed top-0 left-0 z-[999999999] flex w-full items-center justify-end p-[15px] text-white mix-blend-difference">
      {/*
       * The brackets are the site's own mark for a thing you can act on — the
       * hero media sits in them, so does ( in production ), so does the
       * footer's ( Menu ). Here they arrive on hover.
       *
       * They hold their width at rest and only fade and slide, so the word
       * itself never moves and the fixed bar never reflows under the pointer.
       */}
      <button
        type="button"
        onClick={onToggleMenu}
        className="group text-sm font-semibold tracking-wide uppercase"
      >
        <span className="ease-custom-less inline-block -translate-x-[0.35em] opacity-0 transition-all duration-700 group-hover:translate-x-0 group-hover:opacity-100">
          (
        </span>
        <span className="px-[0.35em]">{isMenuOpen ? "Close" : "Menu"}</span>
        <span className="ease-custom-less inline-block translate-x-[0.35em] opacity-0 transition-all duration-700 group-hover:translate-x-0 group-hover:opacity-100">
          )
        </span>
      </button>
    </div>
  );
}
