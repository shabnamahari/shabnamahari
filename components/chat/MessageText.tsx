import { Fragment } from "react";

/**
 * A message, with the addresses in it made clickable.
 *
 * The bot writes plain text and is told to keep writing plain text: Markdown
 * was removed in 0018 because neither channel renders it, so an answer arrived
 * wrapped in asterisks nobody had asked for. But "no Markdown" was taken to
 * mean "no links", and the one address the assistant is allowed to give — the
 * placement assessment — was printed as characters you could read and not
 * reach. Someone who asked how to begin was shown the way and handed nothing
 * to press.
 *
 * So the linking happens here, at the point of display, from the shape of the
 * text rather than from any syntax the model has to remember. Nothing about
 * what the bot is told changes.
 */

/**
 * A full address, or a path on this site.
 *
 * The path arm requires a leading slash followed by an ASCII letter, which in
 * Persian prose is not something that occurs by accident — Persian text uses no
 * Latin except the terms on the allow-list, and its digits are not ASCII
 * either. Deliberately no bare `example.com` arm: guessing that a dotted word
 * is a domain is how ordinary sentences end up underlined.
 */
const ADDRESS =
  /(https?:\/\/[^\s<>"'()]+|\/[A-Za-z][A-Za-z0-9._~-]*(?:\/[A-Za-z0-9._~-]+)*\/?)/g;

/** Punctuation that ends a sentence rather than belonging to the address. */
const TRAILING = /[.,;:!?)»،؛]+$/;

export default function MessageText({ text }: { text: string }) {
  const parts = text.split(ADDRESS);

  return (
    <>
      {parts.map((part, i) => {
        // split() with one capture group alternates: text, match, text, match.
        if (i % 2 === 0 || !part) return <Fragment key={i}>{part}</Fragment>;

        const trimmed = part.replace(TRAILING, "");
        const tail = part.slice(trimmed.length);
        if (!trimmed) return <Fragment key={i}>{part}</Fragment>;

        return (
          <Fragment key={i}>
            <a
              href={trimmed}
              // A new tab even for a path on this site. The conversation lives
              // in the panel's own state, so navigating the page away from
              // under it loses the thread that produced the link.
              target="_blank"
              rel="noreferrer"
              // An address is left-to-right inside a right-to-left sentence,
              // and without its own direction the leading slash drifts to the
              // far end — the link reads `work/ielts/placement-assessment/`.
              dir="ltr"
              className="underline decoration-1 underline-offset-4 [unicode-bidi:isolate] hover:decoration-2"
            >
              {trimmed}
            </a>
            {tail}
          </Fragment>
        );
      })}
    </>
  );
}
