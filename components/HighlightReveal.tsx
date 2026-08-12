"use client";

import { Fragment, useEffect, useRef } from "react";
import type { CSSProperties } from "react";

/**
 * The marker-bar reveal: a solid ink bar draws itself across the words and then
 * retreats, leaving the text behind it.
 *
 * Two movements, and the order matters — the text is only ever uncovered by the
 * bar leaving, never faded in on its own:
 *
 *   1. ▓▓▓▓▓▓▓▓▓▓▓▓  the bar grows left to right over blank space
 *   2. Band Score▓▓  it shrinks toward its right edge, printing the words
 *
 * The reference this came from ran a second pass in the accent colour after
 * these two. It is deliberately not here: on a panel title the black pass is
 * the whole gesture, and the accent one doubled the wait before the title could
 * be read.
 *
 * The bar is a pseudo-element rather than a background, because a background
 * cannot be scaled from one edge without also scaling the text it sits under.
 * Its origin flips from `left` to `right` at the two frames where the bar is at
 * full width — the one moment when the switch is invisible.
 *
 * Words each carry their own bar and start a beat after the one before, so on a
 * title that wraps, the sweep runs on down the lines the way the eye does. That
 * is also why the gaps between words are text nodes outside the spans: a
 * trailing space inside an inline-block is collapsed away, which would run the
 * whole title into one unbroken bar.
 */
export default function HighlightReveal({
  text,
  /** Seconds between one word starting and the next. */
  speed = 0.13,
  /** How many words have gone before this block, so two blocks read as one wave. */
  startIndex = 0,
  /**
   * `view` watches for the block to be scrolled to. `active` leaves the trigger
   * to an ancestor's `data-active` — what an opening panel already sets.
   */
  trigger = "view",
  className = "",
}: {
  text: string;
  speed?: number;
  startIndex?: number;
  trigger?: "view" | "active";
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (trigger !== "view") return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [trigger]);

  const parts = text.split(" ");

  return (
    <span ref={ref} className={`hl-reveal ${className}`} data-trigger={trigger}>
      {parts.map((word, i) => (
        <Fragment key={i}>
          <span
            className="hl-word"
            style={
              { "--hl-stagger": `${(startIndex + i) * speed}s` } as CSSProperties
            }
          >
            <span className="hl-text">{word}</span>
          </span>
          {i < parts.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );
}
