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
