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

export type PageText = {
  url: string;
  text: string;
  /**
   * How much of this page is its own. 1 means every line is unique to it; 0
   * means every line also appears elsewhere.
   *
   * The crawler uses this to skip pages that have nothing to say. A site-wide
   * threshold cannot catch those on its own: the six IELTS gallery pages each
   * list the same five siblings, which is a quarter of the site rather than a
   * majority of it, so the shared-line test leaves it standing. What gives them
   * away is not how often those lines appear but how little else is there.
   */
  uniqueRatio: number;
};

/**
 * Discards the boilerplate that appears across pages, and reports how much of
 * each page was left.
 *
 * Without this, the header, the footer and every navigation list are embedded
 * once per page and dominate retrieval — every question matches every page
 * equally well, because every page really does contain the same words.
 */
export function stripRepeatedBlocks(
  pages: { url: string; text: string }[],
): PageText[] {
  if (pages.length < 3) {
    return pages.map((page) => ({ ...page, uniqueRatio: 1 }));
  }

  const counts = new Map<string, number>();
  for (const page of pages) {
    // A line seen once per page still counts once; repetition within a page is
    // a different problem, handled below.
    for (const line of new Set(page.text.split("\n").map((l) => l.trim()))) {
      if (!line) continue;
      counts.set(line, (counts.get(line) ?? 0) + 1);
    }
  }

  // Half the pages or more, at any length.
  //
  // Both of those numbers were wrong on the first pass. The threshold was 80%,
  // which missed the paragraph that sits on all eighteen gallery pages —
  // 75% — and a 120-character length cap excused it twice over. The result was
  // eighteen near-identical documents that matched every question equally: a
  // search for "where should I start?" returned Finance & Accounting and
  // Sales & Marketing above the placement assessment.
  //
  // Length is no longer part of the test. A paragraph repeated across half a
  // site is boilerplate whatever its literary merit — and if the copy is worth
  // keeping, the place for it is one document that says it once, not eighteen
  // that dilute each other.
  const threshold = Math.ceil(pages.length * 0.5);
  const boilerplate = new Set(
    [...counts].filter(([, n]) => n >= threshold).map(([line]) => line),
  );

  return pages.map((page) => {
    const seen = new Set<string>();
    const kept: string[] = [];
    let ownChars = 0;
    let totalChars = 0;

    for (const raw of page.text.split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      if (boilerplate.has(line)) continue;

      // The gallery marquee prints its sibling list twice. Consecutive repeats
      // were already collapsed during extraction; these are separated by other
      // lines, so they need dropping here.
      if (seen.has(line)) continue;
      seen.add(line);

      kept.push(line);
      totalChars += line.length;
      if ((counts.get(line) ?? 0) <= 1) ownChars += line.length;
    }

    return {
      url: page.url,
      text: kept.join("\n\n"),
      uniqueRatio: totalChars === 0 ? 0 : ownChars / totalChars,
    };
  });
}
