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
const RTL_LETTER = /[֐-ࣿיִ-﷿ﹰ-﻿]/;
const LATIN_LETTER = /[A-Za-z]/;

const isLatinRun = (word: string) =>
  LATIN_LETTER.test(word) && !RTL_LETTER.test(word);

/**
 * The words, with any Latin phrase inside Persian kept in one piece.
 *
 * Each word is an inline-block, which bidi treats as one neutral object rather
 * than as the letters inside it. In a right-to-left line two of those in a row
 * are therefore placed right to left, and "Sir Cue" came out "Cue Sir" — the
 * bot's own name, backwards, the moment the greeting was split for the marker.
 * A Latin phrase in one box is one object, and there is nothing left to
 * reorder.
 *
 * Nothing changes for a line with no right-to-left letters in it: an English
 * title still gets a bar per word.
 */
function tokenise(text: string): string[] {
  const words = text.split(" ");
  if (!RTL_LETTER.test(text)) return words;

  const out: string[] = [];
  for (const word of words) {
    const last = out.length - 1;
    if (last >= 0 && isLatinRun(out[last]) && isLatinRun(word)) {
      out[last] = `${out[last]} ${word}`;
    } else {
      out.push(word);
    }
  }
  return out;
}

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

  const parts = tokenise(text);

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
