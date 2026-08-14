/**
 * Where the Learn section lives, written once.
 *
 * The site used three names for one thing. The menu called it Learn, the page
 * title called it Programs, the URL called it /services, and the Programs
 * inside it sat under a fourth name, /work — a leftover from the portfolio
 * template this site was built from. Nobody browsing ever saw "work"; the
 * assistant printed it, because the assistant prints real addresses, and that
 * is how it surfaced.
 *
 * The addresses were spelled out in nine places, which is why they were able
 * to drift from the words on the page without anything breaking. They are
 * built here now: renaming the section again is one edit, and a link that
 * disagrees with the menu becomes a type error rather than a live page.
 *
 * Old addresses are not abandoned. `next.config.ts` redirects /services and
 * /work/* here permanently — people have been sent those links, and the
 * assistant has put at least one of them in a real conversation.
 */

export const LEARN = "/learn";

/** The Learn index, a Program, or one entry inside a Program. */
export function learnHref(program?: string, entry?: string): string {
  if (!program) return LEARN;
  return entry ? `${LEARN}/${program}/${entry}` : `${LEARN}/${program}`;
}
