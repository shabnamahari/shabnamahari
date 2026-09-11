/**
 * Writes the live system prompts to docs/prompts/.
 *
 *   npm run prompts:export
 *
 * The prompt the bot runs on is the active row in `prompt_versions`, not a file
 * in this repo — the panel at /admin/prompt writes a new version and activates
 * it. That is the right home for it, but it leaves the text the bot actually
 * speaks with unreadable in a diff, so this copies it out after a change.
 *
 * The files are copies and say so in their own header. Editing one changes
 * nothing, which is worth stating loudly: a prompt file that looks editable and
 * silently is not is worse than no file at all.
 */

import "./load-env";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { db } from "@/lib/chatbot/db/client";

const DIR = join(process.cwd(), "docs", "prompts");

async function main() {
  const { data, error } = await db()
    .from("prompt_versions")
    .select("lang, version, note, content, created_at")
    .eq("is_active", true);

  if (error) throw new Error(`prompt_versions read failed: ${error.message}`);
  if (!data?.length) throw new Error("no active prompt in any language");

  mkdirSync(DIR, { recursive: true });

  for (const p of data.sort((a, b) => a.lang.localeCompare(b.lang))) {
    const header =
      `<!--\n` +
      `The live system prompt for "${p.lang}", exported from the database.\n\n` +
      `Active version : v${p.version}\n` +
      `Note           : ${p.note}\n` +
      `Created        : ${p.created_at}\n` +
      `Exported       : ${new Date().toISOString()}\n\n` +
      `This file is a copy for reading and review. The prompt the bot actually\n` +
      `uses is the active row in prompt_versions; editing this file changes\n` +
      `nothing. Edit it in the panel at /admin/prompt, which writes a new\n` +
      `version and activates it, then run \`npm run prompts:export\` again.\n` +
      `-->\n\n`;

    const path = join(DIR, `${p.lang}.md`);
    writeFileSync(path, header + p.content.trimEnd() + "\n", "utf8");
    console.log(`  ✓ docs/prompts/${p.lang}.md — v${p.version}, ${p.content.length} chars`);
  }
}

main().catch((error) => {
  console.error("\n" + (error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
