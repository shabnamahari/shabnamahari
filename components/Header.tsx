"use client";

/**
 * Menu is bracketed wherever ( Back ) sits under it. It is a pair with that
 * word, which is the only reason the gesture exists; on a page with no way
 * back the word is left alone.
 */
export default function Header({
  isMenuOpen,
  onToggleMenu,
  hasBack = false,
}: {
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  hasBack?: boolean;
}) {
  const isBracketed = hasBack;
  const label = isMenuOpen ? "Close" : "Menu";

  return (
    // Menu toggle only — the small wordmark that used to sit on the left
    // collided with the footer's "( Menu )" label at the bottom of the page.
    // `pointer-events-none` on the bar, `auto` on the button.
    //
    // This is full width and sits above everything on the page, so without it
    // the strip across the top of every route swallows every click that lands
    // in it — an invisible bar the width of the window. Nothing noticed while
    // there was only ever empty space up there; the assistant put a control in
    // that strip and it could not be pressed.
    <div className="pointer-events-none fixed top-0 left-0 z-[999999999] flex w-full items-center justify-end p-gutter text-white mix-blend-difference">
      <button
        type="button"
        onClick={onToggleMenu}
        className="group pointer-events-auto text-sm font-semibold tracking-wide uppercase"
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
