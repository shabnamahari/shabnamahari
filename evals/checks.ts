import type { Lang } from "@/lib/chatbot/core/types";

/**
 * The deterministic half of the brand evaluation.
 *
 * Every check here answers a question with a yes or a no, from the text alone.
 * That matters because the alternative — asking a model whether an answer is
 * on-brand — is itself a model call, with the same tone drift it is supposed to
 * be catching.
 *
 * The lists these read come from the database wherever the bot is also told
 * about them, so a test can never disagree with the instruction it is testing.
 */

export type Violation = { rule: string; found: string; detail?: string };

// ---------------------------------------------------------------------------
// Script and language
// ---------------------------------------------------------------------------

const PERSIAN = /[؀-ٟٮ-ۯۺ-ۿ]/g;
const LATIN = /[A-Za-z]/g;

/**
 * A word boundary that works in Persian.
 *
 * JavaScript's `\b` is defined against `[A-Za-z0-9_]` alone, so between a space
 * and a Persian letter there is no transition and therefore no boundary:
 * `/\bشما\b/` matches nothing, ever. Two checks in this suite were written that
 * way and neither did its job — one could never find the formal pronoun it was
 * looking for and failed on every run, the other could never find the agreement
 * it was meant to forbid and passed on every run while testing nothing. The
 * second is the worse of the two, because a test that cannot fail is
 * indistinguishable from a test that is working.
 *
 * Plain substring matching is not the answer either: «شما» is the opening of
 * «شماره» and «شمال», and the bot says «شماره» whenever it asks for a phone
 * number.
 */
const FA_LETTER = "؀-ۿ‌";

export function faWord(...words: string[]): RegExp {
  return new RegExp(`(?<![${FA_LETTER}])(?:${words.join("|")})(?![${FA_LETTER}])`);
}

/** Things that are Latin by nature and say nothing about the writer's language. */
function stripInherentlyLatin(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\S+@\S+\.\S+/g, " ")
    // Markdown link targets, which carry a URL even when the label is Persian.
    .replace(/\]\([^)]*\)/g, "]")
    .replace(/`[^`]*`/g, " ")
    // Bare site paths, e.g. /work/ielts/placement-assessment
    .replace(/\/[a-z0-9-]+(?:\/[a-z0-9-]+)+/gi, " ");
}

export function scriptMix(text: string): { persian: number; latin: number } {
  const stripped = stripInherentlyLatin(text);
  return {
    persian: (stripped.match(PERSIAN) ?? []).length,
    latin: (stripped.match(LATIN) ?? []).length,
  };
}

/**
 * The language an answer is actually written in.
 *
 * `mixed` is a failure state, not a category: an answer that is half right to
 * left and half left to right renders badly and reads worse, which is why the
 * build prompt forbids switching mid-answer.
 */
export function answerLanguage(text: string): Lang | "mixed" | "empty" {
  const { persian, latin } = scriptMix(text);
  const total = persian + latin;
  if (total === 0) return "empty";
  const share = Math.max(persian, latin) / total;
  if (share < 0.75) return "mixed";
  return persian > latin ? "fa" : "en";
}

// ---------------------------------------------------------------------------
// Banned words
// ---------------------------------------------------------------------------

/**
 * Matched on word boundaries for Latin, and on substrings for Persian.
 *
 * Persian has no reliable word boundary a JavaScript regex can see — `\b` is
 * defined against ASCII word characters, so it fires in the middle of a Persian
 * word and misses at its edges. Substring matching over-reports slightly and
 * never under-reports, which is the right direction for a guardrail.
 */
export function bannedWords(text: string, banned: string[], lang: Lang): Violation[] {
  const found: Violation[] = [];
  const haystack = lang === "en" ? text.toLowerCase() : text;

  for (const word of banned) {
    const needle = lang === "en" ? word.toLowerCase() : word;
    const hit =
      lang === "en"
        ? new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(haystack)
        : haystack.includes(needle);
    if (hit) found.push({ rule: "banned word", found: word });
  }
  return found;
}

// ---------------------------------------------------------------------------
// Latin script inside Persian
// ---------------------------------------------------------------------------

export function latinInPersian(text: string, allowlist: string[]): Violation[] {
  let remaining = stripInherentlyLatin(text);

  // Longest first, so "Sir Cue" is consumed before a bare "Cue" could be.
  for (const term of [...allowlist].sort((a, b) => b.length - a.length)) {
    remaining = remaining.split(term).join(" ");
  }

  const runs = remaining.match(/[A-Za-z][A-Za-z'’.-]*/g) ?? [];
  return [...new Set(runs)]
    .filter((run) => run.length > 1)
    .map((run) => ({ rule: "latin script in a Persian answer", found: run }));
}

// ---------------------------------------------------------------------------
// The comprehension rule
// ---------------------------------------------------------------------------

/**
 * Idioms and heavy phrasal verbs, for the B1–B2 rule.
 *
 * Unlike the banned words, this list lives in code rather than in settings.
 * Nothing injects it into the prompt — the prompt states the rule and leaves
 * the judgement to the model — so there is no second copy to drift from. It is
 * a test fixture, and the right place for a test fixture is the test.
 *
 * Deliberately not exhaustive. Every entry is something a B1 reader plausibly
 * misreads, not merely something informal.
 */
const IDIOMS = [
  "nail it", "pull off", "get to grips", "hit the ground running", "in no time",
  "a piece of cake", "up to speed", "on the same page", "touch base",
  "reach out", "circle back", "move the needle", "raise the bar",
  "the bottom line", "at the end of the day", "long story short",
  "cut to the chase", "down the line", "in a nutshell", "by and large",
  "iron out", "brush up on", "figure out", "sort out", "come up with",
  "get the hang of", "keep an eye on", "make headway", "on track",
  "back on your feet", "level up", "game changer", "no-brainer",
  "bang for your buck", "off the bat", "under your belt",
];

export function idiomsInEnglish(text: string): Violation[] {
  const haystack = text.toLowerCase();
  return IDIOMS.filter((idiom) => haystack.includes(idiom)).map((idiom) => ({
    rule: "idiom or heavy phrasal verb (B1–B2 comprehension rule)",
    found: idiom,
  }));
}

// ---------------------------------------------------------------------------
// The tagline
// ---------------------------------------------------------------------------

const TAGLINE = "Your goal speaks English.";

/**
 * A Persian rendering exists and is recorded in the brand guide as deliberately
 * unused. Its appearance is the specific failure this catches.
 */
const TAGLINE_TRANSLATIONS = [
  "هدفت انگلیسی حرف می‌زند",
  "هدفت انگلیسی حرف میزند",
  "هدف شما انگلیسی حرف می‌زند",
  "هدفتان انگلیسی حرف می‌زند",
];

export function taglineViolations(text: string): Violation[] {
  const found: Violation[] = [];

  for (const translation of TAGLINE_TRANSLATIONS) {
    if (text.includes(translation)) {
      found.push({ rule: "tagline was translated", found: translation });
    }
  }

  // A near-miss on the English is its own failure: a mark that gets reworded is
  // no longer a mark.
  const loose = /your goal speaks english/i;
  if (loose.test(text) && !text.includes(TAGLINE)) {
    found.push({
      rule: "tagline was altered",
      found: text.match(loose)?.[0] ?? "",
      detail: `must be exactly "${TAGLINE}"`,
    });
  }

  return found;
}

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

/** Persian and Arabic-Indic digits and separators, folded to ASCII. */
export function foldDigits(text: string): string {
  return text
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[٫،]/g, (c) => (c === "٫" ? "." : ","));
}

/**
 * Numbers in the answer that appear neither in the sources nor in the question.
 *
 * The brand's authority comes from method rather than from statistics that do
 * not exist yet, so an invented figure is one of the four hard bans. Formatting
 * is folded on both sides — a Persian answer writes ۶٫۵ where the source writes
 * 6.5, and those are the same number.
 */
export function unsupportedNumbers(
  answer: string,
  sources: string,
  question: string,
): Violation[] {
  const haystack = foldDigits(`${sources}\n${question}`);

  // URLs and addresses are stripped first. Shabnam's LinkedIn ends in
  // /shabnam-ahari-372573101, and read as prose that is a nine-digit statistic
  // the sources have never heard of — a false positive on the one check whose
  // whole value is that a failure means something.
  const numbers = foldDigits(stripInherentlyLatin(answer)).match(/\d+(?:\.\d+)?/g) ?? [];

  return [...new Set(numbers)]
    .filter((n) => !haystack.includes(n))
    .map((n) => ({
      rule: "number not present in the sources or the question",
      found: n,
    }));
}
