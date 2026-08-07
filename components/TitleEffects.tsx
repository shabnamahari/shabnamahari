import { Fragment } from "react";
import type { CSSProperties } from "react";

function words(text: string) {
  return text.split(" ");
}

/**
 * skiper72 / Horizontal Text reveal — the words arrive from the right, skewed
 * and transparent, one behind the other.
 *
 * The original fires on scroll; here it fires when a panel opens, which is the
 * moment the title has to answer for itself.
 *
 * The gaps between words are text nodes outside the spans, not inside them: a
 * space at the end of an inline-block is collapsed away, which runs the whole
 * title together into one word. Kept outside, it both prints and gives the
 * line somewhere to break when the title is too long for the column.
 */
export function TextRevealH({
  text,
  speed = 0.17,
  startIndex = 0,
}: {
  text: string;
  speed?: number;
  /**
   * How many words have already gone before this one elsewhere. Lets a title
   * and the line under it read as a single wave rather than two that collide.
   */
  startIndex?: number;
}) {
  const parts = words(text);

  return (
    <span className="title-reveal">
      {parts.map((word, i) => (
        <Fragment key={i}>
          <span
            className="title-word"
            style={
              { "--stagger": `${(startIndex + i) * speed}s` } as CSSProperties
            }
          >
            {word}
          </span>
          {i < parts.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );
}
