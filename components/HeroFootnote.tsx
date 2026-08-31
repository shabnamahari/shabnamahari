"use client";

import { useEffect, useRef, useState } from "react";
import Asterisk from "./Asterisk";
import RevealLine from "./RevealLine";

/**
 * The footnote the asterisk has been promising.
 *
 * There has been an asterisk beside the showreel since the hero was built, and
 * an asterisk is a reference to something. Nothing was ever written at the
 * other end of it. This is that thing, and it is the reason this component
 * exists rather than a second label being invented elsewhere on the page.
 *
 * It sits at the foot rather than beside its marker, which is where a footnote
 * goes — and is also the only room left. Directly under the asterisk is "You
 * will reach your", hanging off the line below it.
 *
 * The marker is the same SVG as the big one, not a typed "*", so the two are
 * provably the same mark at two sizes rather than a glyph that happens to
 * resemble it.
 *
 * ( WHY IT MEASURES ITSELF )
 *
 * On a short window there is no foot to sit in. `.hero-stack` caps the type by
 * height, and the arithmetic of that cap leaves exactly 17px between the last
 * line and the bottom padding whenever it binds — at any width, because the cap
 * is what decides the height. Seventeen pixels is less than one line of the
 * note face, so on those windows "ENGLISH" is drawn straight through this
 * sentence. Measured across a grid of window sizes, the failure is a diagonal
 * band rather than a threshold: 900x520 collides and 768x600 does not, 1280x800
 * collides and 1280x700 does not. There is no breakpoint that describes it,
 * because the thing being described is which of the two caps is binding.
 *
 * So it asks. It is clear when it sits wholly below the last line or wholly to
 * its left, and it shows itself only then.
 *
 * Hidden with `visibility` rather than unmounted, and hidden below md the way
 * "Showreel" and "You will reach your" are. Visibility keeps the box in the
 * layout, so the measurement stays true while it is hidden — dropping the box
 * would report it as fitting and flip it straight back on.
 */
export default function HeroFootnote() {
  const ref = useRef<HTMLSpanElement>(null);
  const [fits, setFits] = useState(false);

  useEffect(() => {
    const el = ref.current;
    const hero = el?.closest("h1");
    if (!el || !hero) return;

    const measure = () => {
      const lines = hero.querySelectorAll<HTMLElement>(".text-h1");
      const last = lines[lines.length - 1];
      if (!last) return;
      const note = el.getBoundingClientRect();
      const type = last.getBoundingClientRect();
      setFits(note.top >= type.bottom || note.right <= type.left);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      className="pointer-events-none p-gutter absolute bottom-0 left-0 z-10 max-md:hidden"
      style={{ visibility: fits ? "visible" : "hidden" }}
    >
      {/* After the kicker, which is itself after the last line of the stack. */}
      <RevealLine as="span" delay={0.4} className="text-note inline-block">
        {/* The flex row lives inside, not on the RevealLine: its className
            lands on the masking box, whose only child is the sliding span. */}
        <span className="inline-flex items-baseline" style={{ gap: "0.5em" }}>
          {/* Sized off the note's own type so it tracks it, and nudged onto the
              baseline: the glyph is a full square with no descender, so aligning
              its box leaves it riding high beside lowercase text.

              The em measurements are inline rather than arbitrary utility
              classes. Editing a number inside a class name renames the class,
              and Turbopack has served the old stylesheet against the new markup
              here often enough to cost a session. */}
          <span
            className="inline-block shrink-0"
            style={{ width: "0.55em", transform: "translateY(0.05em)" }}
          >
            <Asterisk className="text-ink w-full" />
          </span>
          Speaking and Writing first.
        </span>
      </RevealLine>
    </span>
  );
}
