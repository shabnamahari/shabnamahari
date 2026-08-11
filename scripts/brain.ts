/**
 * Asks the brain a question, with no channel and no UI in the way.
 *
 *   npm run brain -- "How do the courses work?"
 *   npm run brain -- "دوره‌ها چطور کار می‌کنند؟"
 *   npm run brain -- --model google/gemini-2.5-flash "..."
 *   npm run brain -- --debug "..."     # show what retrieval considered
 *
 * This is the phase 2 acceptance test: the whole pipeline has to answer end to
 * end before any interface exists, so that a bad answer later is unambiguously
 * the interface's fault or the brain's, never both.
 */

import "./load-env";
import { randomUUID } from "node:crypto";

import { converse } from "@/lib/chatbot/core/converse";
import { getModelConfig, getRetrievalConfig } from "@/lib/chatbot/core/config";
import { search } from "@/lib/chatbot/core/retrieve/search";
import { nextConversationLang } from "@/lib/chatbot/core/ingest/lang";
import { db } from "@/lib/chatbot/db/client";

function parseArgs(argv: string[]) {
  let model: string | null = null;
  let debug = false;
  const rest: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--model") model = argv[++i] ?? null;
    else if (argv[i] === "--debug") debug = true;
    else rest.push(argv[i]);
  }
  return { model, debug, question: rest.join(" ").trim() };
}

async function main() {
  const { model, debug, question } = parseArgs(process.argv.slice(2));

  if (!question) {
    console.error('Usage: npm run brain -- [--model SLUG] [--debug] "your question"');
    process.exit(1);
  }

  // Temporarily point the configuration at another model. Written back in a
  // `finally` so an interrupted run does not leave the site on a test model.
  let previousModel: string | null = null;
  if (model) {
    const current = await getModelConfig("web");
    previousModel = current.activeModel;

    // The error has to be checked. `model_config` carries a constraint that the
    // fallback must differ from the active model, so asking to run on the model
    // that is already the fallback is rejected — and an unchecked update then
    // leaves the run silently using the configured model while the console says
    // otherwise, which is how the first Persian test was misread.
    const { error } = await db()
      .from("model_config")
      .update({ active_model: model })
      .is("channel", null);

    if (error) {
      console.error(`Cannot run on ${model}: ${error.message}`);
      console.error(
        `It is probably already set as the fallback model, and the two must differ.`,
      );
      process.exit(1);
    }
    console.log(`(using ${model} for this run)\n`);
  }

  try {
    const lang = nextConversationLang(question, "en");
    console.log(`Q  ${question}`);
    console.log(`   detected language: ${lang}\n`);

    if (debug) {
      const config = await getRetrievalConfig();
      const modelConfig = await getModelConfig("web");
      const result = await search(
        question,
        lang,
        config,
        modelConfig.fallbackModel ?? modelConfig.activeModel,
      );

      if (result.translatedQuery) console.log(`   translated: ${result.translatedQuery}`);
      if (result.translationError) console.log(`   translation FAILED: ${result.translationError}`);
      console.log(`   ${result.candidates.length} candidate(s), ${result.chunks.length} kept ` +
        `(rerank >= ${config.rerankThreshold})\n`);

      for (const c of result.candidates.slice(0, 6)) {
        const kept = (c.relevance ?? 0) >= config.rerankThreshold;
        console.log(
          `   ${kept ? "keep" : "drop"}  rerank ${(c.relevance ?? 0).toFixed(3)}  ` +
            `cosine ${c.similarity.toFixed(3)}  ${c.documentTitle}`,
        );
      }
      console.log("");
    }

    process.stdout.write("A  ");
    let sawText = false;

    for await (const event of converse({
      channel: "web",
      // A fresh identity each run, so one test cannot inherit another's
      // language state or its already-sent placement link.
      externalUserId: `brain-cli-${randomUUID()}`,
      text: question,
    })) {
      switch (event.type) {
        case "sources":
          if (event.citations.length > 0) {
            console.log(
              `[grounded in: ${event.citations.map((c) => `${c.title} (${c.lang})`).join(", ")}]\n   `,
            );
          } else {
            console.log("[no sources matched — logged to `unanswered`]\n   ");
          }
          break;
        case "delta":
          sawText = true;
          process.stdout.write(event.text);
          break;
        case "done":
          console.log(`\n\n   ${event.model}${event.usedFallback ? " (fallback)" : ""} · ` +
            `${event.tokensIn} in / ${event.tokensOut} out · $${event.costUsd.toFixed(6)}`);
          break;
        case "error":
          console.log(`\n\n   error: ${event.message}`);
          process.exitCode = 1;
          break;
      }
    }

    if (!sawText) console.log("(the model returned nothing)");
  } finally {
    if (previousModel) {
      await db().from("model_config").update({ active_model: previousModel }).is("channel", null);
    }
  }
}

main().catch((error) => {
  console.error("\n" + (error instanceof Error ? error.stack : String(error)));
  process.exit(1);
});
