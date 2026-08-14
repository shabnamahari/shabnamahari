/**
 * Crawls the site into the knowledge base.
 *
 *   npx tsx scripts/crawl-site.ts                    # against localhost:3000
 *   npx tsx scripts/crawl-site.ts https://example.com
 *
 * Re-running replaces each page rather than duplicating it, so this is the
 * "re-crawl after a deploy" button the panel will eventually call.
 */

import "./load-env";
import { LEARN, learnHref } from "@/lib/routes";
import { extractFromHtml, stripRepeatedBlocks } from "@/lib/chatbot/core/ingest/extract";
import { ingestDocument } from "@/lib/chatbot/core/ingest/ingest";

/**
 * The routes worth knowing about, derived from the site's own data rather than
 * by following links — the gallery pages are generated from `PROJECTS`, and
 * reading that is both exact and cheaper than a link crawl.
 */
async function routes(): Promise<string[]> {
  const { PROJECTS, galleryItems } = await import("@/lib/projects");
  const paths = ["/", "/about", LEARN];
  for (const project of PROJECTS) {
    paths.push(learnHref(project.slug));
    for (const item of galleryItems(project.slug)) paths.push(item.href);
  }
  return paths;
}

async function main() {
  const origin = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
  const paths = await routes();

  console.log(`Crawling ${paths.length} pages from ${origin}\n`);

  const fetched: { url: string; path: string; title: string; text: string }[] = [];

  for (const path of paths) {
    const url = `${origin}${path}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.log(`  ✗ ${path} — HTTP ${res.status}`);
        continue;
      }
      const { title, text } = extractFromHtml(await res.text());
      fetched.push({ url, path, title, text });
    } catch (error) {
      console.log(`  ✗ ${path} — ${error instanceof Error ? error.message : error}`);
    }
  }

  // Header, footer and navigation appear on every page. Left in, they would be
  // embedded once per page and every question would match every page.
  const cleaned = stripRepeatedBlocks(fetched.map((p) => ({ url: p.url, text: p.text })));
  const byUrl = new Map(cleaned.map((p) => [p.url, p]));

  let ok = 0;
  let empty = 0;
  const keptUrls = new Set<string>();

  // A page has to clear both bars. Length alone let the gallery pages through:
  // stripped of the shared paragraph they still carry a list of their five
  // sibling programs, which is long enough to look like content and matches
  // every question about any program equally well.
  const MIN_CHARS = 120;
  const MIN_UNIQUE_RATIO = 0.35;

  for (const page of fetched) {
    const cleanedPage = byUrl.get(page.url);
    const text = cleanedPage?.text ?? page.text;
    const uniqueRatio = cleanedPage?.uniqueRatio ?? 1;

    if (text.replace(/\s/g, "").length < MIN_CHARS) {
      console.log(`  · ${page.path} — nothing left after boilerplate, skipped`);
      empty += 1;
      continue;
    }

    if (uniqueRatio < MIN_UNIQUE_RATIO) {
      console.log(
        `  · ${page.path} — ${Math.round(uniqueRatio * 100)}% of it appears on other pages, skipped`,
      );
      empty += 1;
      continue;
    }

    try {
      const result = await ingestDocument({
        title: page.title,
        text,
        sourceType: "url",
        sourceUrl: page.url,
      });
      console.log(
        `  ${result.replaced ? "↻" : "✓"} ${page.path} — ${result.chunks} chunk(s), ${result.lang}`,
      );
      keptUrls.add(page.url);
      ok += 1;
    } catch (error) {
      console.log(`  ✗ ${page.path} — ${error instanceof Error ? error.message : error}`);
    }
  }

  // Skipping a page is not the same as removing it. A page that was ingested
  // by an earlier crawl and is skipped by this one stays in the knowledge base,
  // still `ready`, still answering questions from whatever it said last time —
  // which is how tightening the boilerplate rules could leave the exact
  // documents it was meant to remove standing.
  //
  // Same for a route that no longer exists. What should be in the knowledge
  // base is what this crawl decided to keep, so anything else with a crawled
  // URL goes.
  const removed = await removeStaleCrawledDocuments(keptUrls);

  console.log(`\n${ok} page(s) in the knowledge base, ${empty} skipped as boilerplate.`);
  if (removed > 0) console.log(`${removed} stale page(s) removed from an earlier crawl.`);
}

/**
 * Deletes crawled documents that this run did not keep.
 *
 * Scoped to `url` documents, which only this script ever writes — everything
 * uploaded by hand, written in the panel or loaded from `content/kb` is `text`
 * and is never touched by a crawl.
 *
 * Deliberately not scoped to the origin as well. The knowledge base mirrors one
 * site, so a page crawled from a different address is the same page under a
 * name that is no longer used. Matching on origin left those behind: the first
 * crawl from the live site, after the section was renamed to /learn, put a
 * second copy of all six pages in the knowledge base beside six from
 * localhost — same content twice in retrieval, and the stale copies carried
 * the old /work addresses into the prompt the model reads. The same thing would
 * happen again the day this site gets its own domain.
 */
async function removeStaleCrawledDocuments(keptUrls: Set<string>): Promise<number> {
  const { db } = await import("@/lib/chatbot/db/client");

  const { data } = await db()
    .from("documents")
    .select("id, source_url")
    .eq("source_type", "url");

  const stale = (data ?? []).filter((d) => d.source_url && !keptUrls.has(d.source_url));
  if (stale.length === 0) return 0;

  await db().from("documents").delete().in("id", stale.map((d) => d.id));
  return stale.length;
}

main().catch((error) => {
  console.error("\n" + (error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
