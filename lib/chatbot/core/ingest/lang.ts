import type { Lang } from "../types";

/**
 * Two different language questions live here, and conflating them is a bug.
 *
 * `detectDocumentLang` asks "what language is this text?" — a whole page or
 * upload, where there is plenty of signal and one right answer.
 *
 * `nextConversationLang` asks something narrower and stickier: "should this
 * one message change the language we are speaking?" A person practising
 * English who drops in one Persian word because they don't know it yet must
 * not have the whole conversation flip under them.
 */

// Arabic block (Persian is written in it) plus the Arabic Supplement and
// Extended-A ranges, minus the digits, which carry no language signal — Persian
// numerals appear in English text and vice versa.
const PERSIAN_SCRIPT = /[؀-ٟٮ-ۯۺ-ۿﭐ-﷿ﹰ-﻿]/g;
const LATIN_SCRIPT = /[A-Za-z]/g;

function scriptCounts(text: string) {
  return {
    persian: (text.match(PERSIAN_SCRIPT) ?? []).length,
    latin: (text.match(LATIN_SCRIPT) ?? []).length,
  };
}

/**
 * The language of a document or chunk.
 *
 * Biased towards Persian: a page that is mostly English but carries a Persian
 * paragraph is still English, while any substantial run of Persian script means
 * Persian, because English words appear inside Persian copy far more often than
 * the reverse.
 */
export function detectDocumentLang(text: string): Lang {
  const { persian, latin } = scriptCounts(text);
  if (persian === 0) return "en";
  return persian / (persian + latin) >= 0.2 ? "fa" : "en";
}

/**
 * Whether this message should move the conversation's language, and to what.
 *
 * The rules, from section 03 of the build prompt:
 *
 *   - a full sentence in the other language switches, from that message on
 *   - a short or single-word message never switches: a number, an email, a
 *     link, "باشه", "ok"
 *   - the toggle and `/lang` always win, which is handled by the caller rather
 *     than here, because it is not an inference at all
 *
 * The second rule is the one with teeth. Without it, someone practising English
 * who writes one Persian word gets answered in Persian for the rest of the
 * conversation — punished for the exact behaviour the brand exists to fix.
 */
export function nextConversationLang(message: string, current: Lang): Lang {
  const text = message.trim();

  // Strip the things that look like language but are not: URLs, emails, and
  // bare numbers are Latin by nature and say nothing about what someone speaks.
  const stripped = text
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\S+@\S+\.\S+/g, " ")
    .replace(/[\d۰-۹٠-٩]+/g, " ");

  const { persian, latin } = scriptCounts(stripped);
  const letters = persian + latin;

  // Too short to carry an intention. "ok", "باشه", "yes", a single name — none
  // of these are a request to change language.
  const MIN_LETTERS_TO_SWITCH = 12;
  if (letters < MIN_LETTERS_TO_SWITCH) return current;

  // Roughly "is this a sentence rather than a fragment". Two words is a phrase;
  // a switch should need more than that.
  const words = stripped.split(/\s+/).filter(Boolean);
  if (words.length < 3) return current;

  const candidate: Lang = persian > latin ? "fa" : "en";
  if (candidate === current) return current;

  // Committed enough to be deliberate. A mostly-English sentence with a Persian
  // word in it stays English, and the mirror case stays Persian.
  const dominance = candidate === "fa" ? persian / letters : latin / letters;
  return dominance >= 0.7 ? candidate : current;
}
