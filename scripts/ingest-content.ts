/**
 * Puts everything in content/kb into the knowledge base.
 *
 *   npm run kb:content
 *
 * Each file carries its title and language in frontmatter, and is keyed by
 * filename so re-running replaces rather than duplicates. Edit a file, run this
 * again, and that document is rebuilt — the rest are left alone.
 *
 * These files hold what the website itself does not say yet: what the placement
 * assessment involves, what each course requires, the cancellation policy. Until
 * the site carries that copy, this directory is where it lives.
 */

import "./load-env";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { db } from "@/lib/chatbot/db/client";
import { ingestDocument } from "@/lib/chatbot/core/ingest/ingest";
import type { Lang } from "@/lib/chatbot/core/types";

const DIR = join(process.cwd(), "content", "kb");
const KEY = "content://kb/";

/**
 * Deletes documents whose file is no longer in content/kb.
 *
 * Re-running replaced each file it found and left everything else alone, which
 * is correct until a file is renamed or split — then the old document stays in
 * the knowledge base and the bot answers from both. It nearly happened here:
 * `policies` became `payment-and-policies`, and the abandoned copy still said
 * the pre-recorded courses were "offline", which is the one wording Shabnam had
 * just corrected. Retrieval would have had no way to tell which was current.
 */
async function removeStale(present: string[]): Promise<number> {
  const keep = present.map((file) => `${KEY}${file}`);

  const { data, error } = await db()
    .from("documents")
    .select("id, source_url, title")
    .like("source_url", `${KEY}%`);

  if (error) throw new Error(`could not list knowledge-base documents: ${error.message}`);

  const stale = (data ?? []).filter((doc) => !keep.includes(doc.source_url ?? ""));
  if (stale.length === 0) return 0;

  for (const doc of stale) console.log(`  – ${doc.source_url?.slice(KEY.length)} (removed)`);

  const { error: deleteError } = await db()
    .from("documents")
    .delete()
    .in("id", stale.map((doc) => doc.id));

  if (deleteError) throw new Error(`could not remove stale documents: ${deleteError.message}`);
  return stale.length;
}

/**
 * Reads the leading `--- ... ---` block.
 *
 * A hand-rolled reader rather than a YAML dependency: these are three scalar
 * keys written by us, and the failure mode of getting it wrong is a document
 * titled "undefined" rather than anything subtle.
 */
function parseFrontmatter(source: string): {
  meta: Record<string, string>;
  body: string;
} {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { meta: {}, body: source };

  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const at = line.indexOf(":");
    if (at === -1) continue;
    meta[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }

  return { meta, body: source.slice(match[0].length) };
}

function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

async function main() {
  const files = readdirSync(DIR).filter((name) => name.endsWith(".md")).sort();

  if (files.length === 0) {
    console.log("Nothing in content/kb.");
    return;
  }

  console.log(`Ingesting ${files.length} file(s) from content/kb\n`);
  let ok = 0;

  for (const file of files) {
    const { meta, body } = parseFrontmatter(readFileSync(join(DIR, file), "utf8"));

    const title = meta.title;
    if (!title) {
      console.log(`  ✗ ${file} — no title in frontmatter`);
      continue;
    }

    // Stated rather than detected. These files are written deliberately in one
    // language, and a Persian document quoting four English skill names could
    // plausibly trip detection the wrong way.
    const lang = meta.lang === "fa" || meta.lang === "en" ? (meta.lang as Lang) : undefined;
    if (!lang) {
      console.log(`  ✗ ${file} — frontmatter must set lang to en or fa`);
      continue;
    }

    try {
      const result = await ingestDocument({
        title,
        text: body,
        lang,
        sourceType: "text",
        // Not a real URL — a stable key, so re-running replaces this document
        // instead of adding another copy of it.
        sourceUrl: `content://kb/${file}`,
        tags: parseTags(meta.tags),
      });
      console.log(
        `  ${result.replaced ? "↻" : "✓"} ${file} — ${result.chunks} chunk(s), ${lang}`,
      );
      ok += 1;
    } catch (error) {
      console.log(`  ✗ ${file} — ${error instanceof Error ? error.message : error}`);
    }
  }

  const removed = await removeStale(files);

  console.log(`\n${ok} of ${files.length} file(s) in the knowledge base.`);
  if (removed > 0) console.log(`${removed} document(s) no longer on disk were removed.`);
}

main().catch((error) => {
  console.error("\n" + (error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
