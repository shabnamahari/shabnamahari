"use client";

import type { ReactNode } from "react";

/** The element the assistant portals its bar into — see `Assistant`. */
export const HEADER_SEARCH_SLOT = "header-search";

/**
 * Menu is bracketed wherever ( Back ) sits under it. It is a pair with that
 * word, which is the only reason the gesture exists; on a page with no way
 * back the word is left alone.
 *
 * ( TWO ROWS ON A PHONE )
 *
 * The assistant's bar, Back and Menu used to be placed independently — the bar
 * absolute at the top of the page, the two words each in a fixed strip of their
 * own — and below md there is not the width for that: the bar is at least 20rem
 * and MENU landed on top of it. So below md they are one fixed, wrapping flex
 * box, which cannot overlap by construction, on Paper, the brand guide's colour
 * for sticky headers (p.9), so the page does not show through while scrolling.
 *
 * Back and Menu take the first row, right-aligned; the bar takes the whole
 * second row. It used to share one row with them, and there it could never be
 * as wide as the chat panels hanging under it — on a 375px phone the panels'
 * right edge is 32px under MENU. On a row of its own it takes their exact
 * measure. The first row is Back's 36px whether or not Back is there, so the
 * header is one height on every page — --site-header-h and
 * --site-header-menu-row in globals.css.
 *
 * From md up every `md:` class below puts each piece back exactly where it was:
 * the bar's slot centred at the top of the page and scrolling away with it,
 * Menu and Back in their own full-width fixed strips. The header itself goes
 * `md:z-auto` so it forms no stacking context there — Menu and Back blend
 * against the page, as they always have, rather than against a transparent
 * header.
 *
 * Below md it does form one, and that is what keeps the blend right: the two
 * words blend against the header's own Paper, so they come out near-ink on it
 * wherever the page has scrolled to, over the footer's black included.
 *
 * The background steps aside while the menu is open. The overlay is ink from
 * edge to edge, and a Paper strip across its top would be a second surface
 * where there is meant to be one.
 */
export default function Header({
  isMenuOpen,
  onToggleMenu,
  hasBack = false,
  back,
}: {
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  hasBack?: boolean;
  /** The Back control, or nothing — `SiteChrome` decides when it shows. */
  back?: ReactNode;
}) {
  const isBracketed = hasBack;
  const label = isMenuOpen ? "Close" : "Menu";

  return (
    // `pointer-events-none` on the bar, `auto` on the controls, at desktop
    // widths.
    //
    // There this is full width and sits above everything on the page, so
    // without it the strip across the top of every route swallows every click
    // that lands in it — an invisible bar the width of the window. Nothing
    // noticed while there was only ever empty space up there; the assistant put
    // a control in that strip and it could not be pressed. Below md the header
    // is solid, so it takes the clicks that land on it — except while the menu
    // is open and it has no background to justify that.
    <header
      className={`pointer-events-none fixed inset-x-0 top-0 z-[999999999] flex flex-wrap items-center justify-end gap-x-3 gap-y-2 px-4 pt-2 pb-3 md:absolute md:z-auto md:block md:p-4 ${
        isMenuOpen
          ? ""
          : "max-md:pointer-events-auto max-md:bg-paper/90 max-md:backdrop-blur-sm"
      }`}
    >
      {/* The assistant's bar lands here. 42px tall below md so the row does not
          grow when it arrives after hydration — BAR_DEFAULT in Assistant — and
          --site-header-h in globals.css, which pads <main>, counts it. From md
          it takes WIDTH from Assistant, as the bar did when it sat in the
          assistant's own column.

          Below md it is first in the markup, so the tab order is what it
          always was, and `order-last` draws it on the second row. The whole
          row is the slot — `basis-full` is what forces the wrap — and the
          padding narrows what is inside it to the chat panels' measure:
          min(20rem, 100%), centred, in a column with the same 16px sides as
          this header. A max-width would not do: a 20rem box fits beside Menu
          on a wide phone and the row would never break. */}
      <div
        id={HEADER_SEARCH_SLOT}
        className="min-w-0 max-md:order-last max-md:min-h-[42px] max-md:basis-full max-md:px-[max(0px,calc((100%_-_20rem)/2))] md:relative md:z-50 md:mx-auto md:w-[clamp(20rem,34vw,40rem)]"
      />

      {back ? (
        <div className="shrink-0 text-white mix-blend-difference md:pointer-events-none md:fixed md:top-[38px] md:right-0 md:z-[999999999] md:flex md:w-full md:items-center md:justify-end md:px-gutter">
          {back}
        </div>
      ) : null}

      {/* Menu toggle only — the small wordmark that used to sit on the left
          collided with the footer's "( Menu )" label at the bottom of the
          page. */}
      <div className="shrink-0 text-white mix-blend-difference md:pointer-events-none md:fixed md:top-0 md:left-0 md:z-[999999999] md:flex md:w-full md:items-center md:justify-end md:p-gutter">
        <button
          type="button"
          onClick={onToggleMenu}
          /* 36px tall below md: Back's height, so Menu's row is the same with
             or without Back beside it, and the target is taller than the word. */
          className="group pointer-events-auto text-sm font-semibold tracking-wide uppercase max-md:h-9"
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
    </header>
  );
}
