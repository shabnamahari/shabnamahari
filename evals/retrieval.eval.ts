import { describe, expect, test } from "vitest";

import { getModelConfig, getRetrievalConfig } from "@/lib/chatbot/core/config";
import { search } from "@/lib/chatbot/core/retrieve/search";
import { db } from "@/lib/chatbot/db/client";
import type { Lang } from "@/lib/chatbot/core/types";

/**
 * Retrieval on its own, with no model writing an answer.
 *
 * Separated from the brand suite for two reasons. It is cheap — embeddings and
 * a rerank, no generation — so it can run on every push where the brand suite
 * cannot. And when a brand test fails it is the first thing to check: an answer
 * that says "I don't know" is either a prompt problem or a retrieval problem,
 * and these tests tell you which.
 *
 * The cross-lingual cases are the point. A Persian question against an English
 * passage scored 1.2 to 1.8 times lower than the same question in English on
 * every passage measured, which is enough to drop a correct chunk below the
 * threshold. That failure is silent — the bot says it does not know while the
 * answer sits in the knowledge base — so it needs a test that fails loudly.
 */

type Case = {
  name: string;
  query: string;
  lang: Lang;
  /** A document title that must survive into the kept set. */
  expectTitle: RegExp;
};

const CASES: Case[] = [
  {
    name: "English question, English source",
    query: "What does the placement assessment involve?",
    lang: "en",
    expectTitle: /placement/i,
  },
  {
    name: "Persian question, Persian source",
    query: "تعیین سطح شامل چه چیزهایی است؟",
    lang: "fa",
    expectTitle: /placement|تعیین سطح/i,
  },
  {
    name: "Persian question, answer lives in English",
    query: "برای دوره‌ی نمره‌ی ۶٫۵ چه پیش‌نیازی لازم است؟",
    lang: "fa",
    expectTitle: /courses|دوره/i,
  },
  {
    name: "English question, answer lives in Persian",
    query: "Can I move a session to another day?",
    lang: "en",
    expectTitle: /cancel|لغو/i,
  },
  {
    name: "a vague but answerable question still retrieves",
    query: "Where should I start?",
    lang: "en",
    expectTitle: /placement|courses/i,
  },
];

describe("retrieval", () => {
  test("the knowledge base is populated", async () => {
    const { count } = await db()
      .from("chunks")
      .select("*", { count: "exact", head: true });

    // Every case below would fail confusingly against an empty index; this
    // fails clearly instead.
    expect(count ?? 0, "no chunks — run npm run kb:crawl and kb:content").toBeGreaterThan(0);
  });

  test.each(CASES)("$name", async ({ query, lang, expectTitle }) => {
    const config = await getRetrievalConfig();
    const modelConfig = await getModelConfig("web");

    const result = await search(
      query,
      lang,
      config,
      modelConfig.fallbackModel ?? modelConfig.activeModel,
    );

    const kept = result.chunks.map((c) => c.documentTitle);
    const considered = result.candidates
      .slice(0, 5)
      .map((c) => `${c.documentTitle} ${(c.relevance ?? 0).toFixed(3)}`)
      .join(", ");

    expect(
      kept.some((title) => expectTitle.test(title)),
      `expected ${expectTitle} among the kept chunks.\n` +
        `  kept:       ${kept.join(", ") || "(nothing cleared the threshold)"}\n` +
        `  considered: ${considered}`,
    ).toBe(true);
  });

  test("a question with no answer in the knowledge base keeps nothing", async () => {
    const config = await getRetrievalConfig();
    const modelConfig = await getModelConfig("web");

    // Nothing about visa applications is anywhere in the knowledge base, and
    // this is the case that has to produce "I do not know" rather than the
    // nearest passage about something else.
    const result = await search(
      "Can you help me fill in my Canadian visa application form?",
      "en",
      config,
      modelConfig.fallbackModel ?? modelConfig.activeModel,
    );

    const best = result.candidates[0]?.relevance ?? 0;
    expect(
      result.chunks.length,
      `kept ${result.chunks.length} chunk(s) for an unrelated question; ` +
        `best rerank score was ${best.toFixed(3)} against a threshold of ${config.rerankThreshold}`,
    ).toBe(0);
  });
});
