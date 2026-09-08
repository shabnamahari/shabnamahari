import Link from "next/link";

import { HOMEPAGE_LINKS } from "@/lib/projects";
import RevealLine from "./RevealLine";

/**
 * The one thing the hero never said.
 *
 * The stack is the tagline, and the tagline is a fixed mark — brand guide p.5,
 * never reworded, never translated — so the category cannot be added *to* it.
 * It goes beside it instead, in the corner Menu left empty, so the top of the
 * page reads as a single line: what this is on the left, the way in on the
 * right. Same face, same size, same baseline, same blend as Menu, because the
 * pairing is the whole idea and a near-match would read as a mistake.
 *
 * Absolute rather than fixed. Fixed is what put a wordmark in this corner once
 * before, and it rode the page down onto the footer's ( Menu ).
 *
 * It leans, like the coral block does, at its own size — 2px rather than a
 * fraction of the headline, because this type does not scale with the window.
 *
 * On touch there is no hover, so the lean is bound to :active as well: a tap's
 * only moment is while the finger is down, and that is when it can confirm the
 * tap landed. The hover rule itself is gated behind (hover: hover) — without
 * that, tapping a link on iOS leaves it stuck in its hovered state after the
 * page has changed. globals.css already draws this distinction for the custom
 * cursor, and for the same reason.
 *
 * The transform sits on this span rather than on the anchor. The anchor is
 * inside the reveal's mask, which is overflow:hidden, so moving it left would
 * shave its own left edge off; moving the box the mask lives in moves all of
 * it. That is why the stylesheet reaches this element through :has().
 *
 * "online" is not decoration. Half the people this is written for are outside
 * Iran, and it is the word that tells them the service reaches them at all.
 *
 * ( WHEN IT SHOWS )
 *
 * The coral block beside GOAL says IELTS far louder than this corner can, and
 * two labels saying the same word on one screen read as an oversight rather
 * than a hierarchy. So this stands down wherever the block is speaking, and
 * carries the word wherever it is not. They are never both on screen, and
 * there is never a window with neither.
 *
 * That handover is driven by whether the block actually rendered, not by a
 * breakpoint. Keyed to md alone it left a hole: this stood down at 768 while
 * the block needs about 872 before it fits beside GOAL, so every window from
 * 768 to 864 — iPad portrait among them — had nothing on it saying IELTS.
 * The block is sized from measured type against the room beside it, so the
 * width where it starts fitting is not a number this file can know.
 *
 * The cost, on the record: "online" is the one thing the block does not say,
 * and it is gone from desktop with this.
 *
 * It sits at the foot rather than the top because the assistant's bar goes
 * full width on a phone and takes the corner this used on desktop. The foot of
 * the hero is still inside the first screen.
 */
export default function HeroKicker({ standDown }: { standDown: boolean }) {
  return (
    <span
      data-hero-kicker
      className={`pointer-events-none p-gutter absolute bottom-0 left-0 z-10 text-white mix-blend-difference ${
        /* md:hidden is the resting state, so a desktop that is about to show
           the block never flashes this first: it starts hidden there and only
           reappears if the block reports that it could not fit. */
        standDown ? "md:hidden" : ""
      }`}
    >
      {/* Last in, a beat after "English" — the stack runs 0 to 0.2667 in
          fifteenths of a second, and this is the next step in that series. */}
      <RevealLine
        as="span"
        delay={0.3333}
        className="inline-block text-sm font-semibold tracking-wide uppercase"
      >
        <Link
          href={HOMEPAGE_LINKS.ielts}
          className="pointer-events-auto inline-block"
        >
          IELTS preparation · online
        </Link>
      </RevealLine>
    </span>
  );
}
