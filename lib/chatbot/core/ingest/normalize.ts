import type { Lang } from "../types";

/**
 * Persian text arrives spelled several different ways for the same word, and
 * the embedding model treats those spellings as different strings. Without
 * this, Persian retrieval degrades quietly: the question and the passage say
 * the same thing and score as if they did not.
 *
 * Every substitution here is invisible to a reader. The Arabic yeh and the
 * Persian yeh render identically in almost every font; tatweel is a decorative
 * stretch; harakat are pronunciation marks that Persian prose does not use.
 * Nothing changes how the text looks, which is what makes it safe to run on the
 * stored content rather than on a separate copy kept only for searching.
 *
 * Digits are deliberately left alone. Converting ۷ to 7 would help a search for
 * "band 7" match «نمره‌ی ۷», but it also changes what a Persian reader sees in
 * a quoted source — and the build prompt's list of normalisations does not ask
 * for it.
 */

const SUBSTITUTIONS: [RegExp, string][] = [
  // Arabic yeh and alef maksura → Persian yeh.
  [/[يى]/g, "ی"],
  // Arabic kaf → Persian keheh.
  [/ك/g, "ک"],
  // Arabic heh with hamza above, frequently typed for a plain heh.
  [/ۀ/g, "ه"],
  // Tatweel: a decorative elongation with no meaning.
  [/ـ/g, ""],
  // Harakat and other combining marks: fathatan through sukun, plus the
  // superscript alef.
  [/[ً-ْٰ]/g, ""],
  // Arabic comma and semicolon are used interchangeably with the Latin ones.
  [/،/g, "،"],
];

/** Collapses runs of zero-width non-joiners and strips them next to spaces. */
function normalizeZwnj(text: string): string {
  return text
    .replace(/‌{2,}/g, "‌")
    // A ZWNJ touching a space is always a typo — the space already separates.
    .replace(/‌\s/g, " ")
    .replace(/\s‌/g, " ")
    // Other zero-width characters carry no meaning here and only break matching.
    .replace(/[​‍﻿]/g, "");
}

/** Whitespace tidy-up that is safe in either language. */
function collapseWhitespace(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    // Trailing spaces on a line, which survive most HTML extraction.
    .replace(/[ \t]+$/gm, "")
    .replace(/[ \t]{2,}/g, " ")
    // Three or more blank lines carry no more structure than two.
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Cleans extracted text for storage and embedding.
 *
 * The Persian substitutions run only on Persian text, per the build prompt.
 * Running them on English is harmless in practice but would mean an English
 * document with one Arabic quotation silently has that quotation rewritten.
 */
export function normalizeText(text: string, lang: Lang): string {
  let out = collapseWhitespace(text);
  if (lang === "fa") {
    for (const [pattern, replacement] of SUBSTITUTIONS) {
      out = out.replace(pattern, replacement);
    }
    out = normalizeZwnj(out);
  }
  return out;
}

/**
 * The same treatment for a question before it is embedded.
 *
 * A query normalised differently from the documents is the classic way to lose
 * recall without any error appearing anywhere, so both paths call into here.
 */
export function normalizeQuery(text: string, lang: Lang): string {
  return normalizeText(text, lang);
}
