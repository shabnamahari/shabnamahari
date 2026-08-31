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
 * Unbracketed on purpose: ( ) is this site's mark for a thing you can press.
 *
 * "online" is not decoration. Half the people this is written for are outside
 * Iran, and it is the word that tells them the service reaches them at all.
 *
 * Below md it drops to the foot of the hero. The assistant's bar is 20rem at
 * its narrowest and centred, which on a 375px window leaves 27px either side —
 * not a gutter, and not somewhere to put the only words that say what is sold
 * here. The foot of the hero is still inside the first screen.
 */
export default function HeroKicker() {
  return (
    <span className="pointer-events-none p-gutter absolute left-0 z-10 text-white mix-blend-difference max-md:bottom-0 md:top-0">
      {/* Last in, a beat after "English" — the stack runs 0 to 0.2667 in
          fifteenths of a second, and this is the next step in that series. */}
      <RevealLine
        as="span"
        delay={0.3333}
        className="inline-block text-sm font-semibold tracking-wide uppercase"
      >
        IELTS preparation · online
      </RevealLine>
    </span>
  );
}
