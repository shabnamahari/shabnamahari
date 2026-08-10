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
import { extractFromHtml, stripRepeatedBlocks } from "@/lib/chatbot/core/ingest/extract";
import { ingestDocument } from "@/lib/chatbot/core/ingest/ingest";

/**
 * The routes worth knowing about, derived from the site's own data rather than
 * by following links — the gallery pages are generated from `PROJECTS`, and
 * reading that is both exact and cheaper than a link crawl.
 */
async function routes(): Promise<string[]> {
  const { PROJECTS, galleryItems } = await import("@/lib/projects");
  const paths = ["/", "/about", "/services"];
  for (const project of PROJECTS) {
    paths.push(`/work/${project.slug}`);
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
  const textByUrl = new Map(cleaned.map((p) => [p.url, p.text]));

  let ok = 0;
  let empty = 0;

  for (const page of fetched) {
    const text = textByUrl.get(page.url) ?? page.text;

    // A page whose prose is entirely boilerplate has nothing to say. Storing it
    // would add a document that can only ever match navigation words.
    if (text.replace(/\s/g, "").length < 120) {
      console.log(`  · ${page.path} — too little prose after boilerplate removal, skipped`);
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
      ok += 1;
    } catch (error) {
      console.log(`  ✗ ${page.path} — ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log(`\n${ok} page(s) in the knowledge base, ${empty} skipped as boilerplate.`);
}

main().catch((error) => {
  console.error("\n" + (error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
