/**
 * Turning a rendered page into the prose a reader would actually see.
 *
 * Written against HTML strings rather than a DOM library on purpose: the only
 * pages this crawls are this site's own, the markup is known, and a parser
 * dependency for a handful of static pages is a poor trade. If the knowledge
 * base ever takes in arbitrary third-party pages, this is the piece to replace.
 */

export type Extracted = {
  title: string;
  text: string;
};

/** Elements whose contents are never prose. */
const DROPPED_ELEMENTS = /<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi;

/** Elements that end a paragraph, so removing tags does not weld sentences together. */
const BLOCK_ELEMENTS =
  /<\/?(p|div|section|article|main|header|footer|nav|h[1-6]|li|ul|ol|br|tr|td|th|figure|figcaption|blockquote|hr)\b[^>]*>/gi;

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
  "&rsquo;": "’",
  "&lsquo;": "‘",
  "&rdquo;": "”",
  "&ldquo;": "“",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&[a-z]+;|&#\d+;/gi, (match) => {
      const named = ENTITIES[match.toLowerCase()];
      if (named) return named;
      const numeric = match.match(/^&#(\d+);$/);
      return numeric ? String.fromCodePoint(Number(numeric[1])) : match;
    });
}

/**
 * Undoes the site's own visual repetition.
 *
 * The kinetic category tiles stack three copies of a word to animate between
 * them, and the gallery renders its program list twice for a marquee. In the
 * browser those are one word and one list; in extracted text they arrive as
 * "IELTSIELTSIELTS" and a duplicated block, and embed as something no reader
 * ever saw.
 */
function collapseVisualRepeats(lines: string[]): string[] {
  const out: string[] = [];

  for (const raw of lines) {
    // A line that is one token repeated end to end, e.g. "IELTSIELTSIELTS" or
    // "Set Up Your AccountSet Up Your Account".
    const line = raw.replace(/^(.{2,60}?)\1+$/u, "$1");

    // The same, but where the repeats are separated by the rest of the line's
    // punctuation, e.g. ") IELTSIELTSIELTSBlogCasts…".
    const cleaned = line.replace(/(.{3,40}?)\1{2,}/gu, "$1");

    // Consecutive identical lines: the marquee duplicate.
    if (out.length > 0 && out[out.length - 1] === cleaned) continue;
    out.push(cleaned);
  }

  return out;
}

/**
 * Whether a line carries meaning a reader would recognise as content.
 *
 * The site uses bare brackets as a decorative mark — "( )", "))", "# 01" — and
 * those survive tag stripping as lines of their own. They are not prose, and
 * left in they dilute the embedding of the page they sit on.
 */
function isProse(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // Nothing but punctuation, brackets, digits or section numbering.
  if (!/[\p{L}]/u.test(trimmed)) return false;
  if (/^[#(){}[\]·—–\-|/\\.,:;]+\s*\d*\s*[#(){}[\]·—–\-|/\\.,:;]*$/u.test(trimmed)) return false;
  return true;
}

export function extractFromHtml(html: string): Extracted {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const rawTitle = titleMatch ? decodeEntities(titleMatch[1]).trim() : "";

  const text = decodeEntities(
    html
      .replace(DROPPED_ELEMENTS, " ")
      .replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, " ")
      // Block boundaries become blank lines, which is what the chunker splits
      // on. Doing this before stripping the remaining tags is the whole trick:
      // afterwards there is nothing left to tell one paragraph from the next.
      .replace(BLOCK_ELEMENTS, "\n\n")
      .replace(/<[^>]+>/g, ""),
  );

  const lines = collapseVisualRepeats(
    text
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(isProse),
  );

  return {
    // The site's own titles carry a suffix that repeats on every page and would
    // dilute the embedding of each one.
    title: rawTitle.replace(/\s*[—|]\s*Shabnam Ahari\s*$/i, "").trim() || "Untitled",
    // Blank-line separated, because that is the boundary the chunker splits on.
    text: lines.join("\n\n"),
  };
}

/**
 * Discards the boilerplate that appears identically on every page.
 *
 * Without this, the header and footer are embedded once per page and dominate
 * retrieval — every question matches every page equally well, because every
 * page really does contain the same navigation words.
 */
export function stripRepeatedBlocks(
  pages: { url: string; text: string }[],
): { url: string; text: string }[] {
  if (pages.length < 3) return pages;

  const counts = new Map<string, number>();
  for (const page of pages) {
    // A line seen once per page still counts once; repetition within a page is
    // a different problem.
    for (const line of new Set(page.text.split("\n").map((l) => l.trim()))) {
      if (!line) continue;
      counts.set(line, (counts.get(line) ?? 0) + 1);
    }
  }

  // Present on nearly every page and short enough to be a label rather than a
  // sentence. The length test matters: a genuine tagline repeated site-wide is
  // boilerplate, but so is "Menu" — while a long paragraph appearing everywhere
  // would more likely be real shared copy worth keeping once.
  const threshold = Math.ceil(pages.length * 0.8);
  const boilerplate = new Set(
    [...counts].filter(([line, n]) => n >= threshold && line.length < 120).map(([line]) => line),
  );

  return pages.map((page) => ({
    url: page.url,
    text: page.text
      .split("\n")
      .filter((line) => !boilerplate.has(line.trim()))
      .join("\n"),
  }));
}
