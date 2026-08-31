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
 * ( WHY IT IS NOW A PHONE ONLY )
 *
 * The coral block beside GOAL says IELTS far louder than this corner can, and
 * two labels saying the same word on one screen read as an oversight rather
 * than a hierarchy. So above md the block has the job and this stands down.
 * Below md the block cannot fit beside GOAL at the cap height that is its
 * whole idea, so this has it instead. They are never both on screen.
 *
 * The cost, on the record: "online" is the one thing the block does not say,
 * and it is gone from desktop with this.
 *
 * It sits at the foot rather than the top because the assistant's bar goes
 * full width on a phone and takes the corner this used on desktop. The foot of
 * the hero is still inside the first screen.
 */
export default function HeroKicker() {
  return (
    <span className="pointer-events-none p-gutter absolute bottom-0 left-0 z-10 text-white mix-blend-difference md:hidden">
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
