import "server-only";

import { db } from "@/lib/chatbot/db/client";
import { embed, rerank } from "../embed";
import { complete } from "../generate/openrouter";
import { normalizeQuery } from "../ingest/normalize";
import type { Lang, RetrievalConfig, RetrievedChunk } from "../types";

export type SearchResult = {
  chunks: RetrievedChunk[];
  /** Every candidate the vector search returned, before the reranker cut it
   *  down. The playground shows this — it is the only way to see a
   *  cross-lingual drop, where the right chunk was found and then discarded. */
  candidates: RetrievedChunk[];
  /** The English rendering of a Persian question, when one was made. */
  translatedQuery: string | null;
  /** Set when translation was attempted and failed, so the caller can say the
   *  search ran in degraded form rather than silently returning less. */
  translationError: string | null;
};

/**
 * Which language the knowledge base is mostly written in.
 *
 * Not hardcoded to English even though it is English today: the moment Shabnam
 * uploads Persian material the dominant language shifts, and a hardcoded
 * constant would keep translating in the wrong direction without anything
 * failing.
 */
async function dominantKbLang(): Promise<Lang> {
  const { data, error } = await db()
    .from("chunks")
    .select("lang, token_count");

  if (error || !data || data.length === 0) return "en";

  let fa = 0;
  let en = 0;
  for (const row of data) {
    // Weighted by size, so one short Persian note does not outvote the site.
    if (row.lang === "fa") fa += row.token_count;
    else en += row.token_count;
  }
  return fa > en ? "fa" : "en";
}

/**
 * Renders the question in the knowledge base's language.
 *
 * Measured against this site's copy, a Persian question scores far below its
 * English twin on the same English passage — 0.36 against 0.58 for the same
 * question about Band 7. Searching with both recovers most of that.
 *
 * The prompt asks for a search query rather than a translation on purpose: a
 * literal rendering of "از کجا باید شروع کنم؟" keeps the vagueness that made it
 * score badly in the first place.
 */
async function translateForSearch(
  query: string,
  from: Lang,
  to: Lang,
  model: string,
): Promise<string> {
  const { text } = await complete({
    model,
    maxTokens: 120,
    messages: [
      {
        role: "system",
        content:
          `Rewrite the user's question as a search query in ${to === "en" ? "English" : "Persian"}. ` +
          `Keep every specific detail — band scores, dates, program names. ` +
          `Reply with the query only, no quotes and no explanation.`,
      },
      { role: "user", content: query },
    ],
  });

  return text.trim().replace(/^["'«]|["'»]$/g, "");
}

/** Merges hits from several embeddings, keeping the best score for each chunk. */
function mergeByBestScore(lists: RetrievedChunk[][]): RetrievedChunk[] {
  const best = new Map<string, RetrievedChunk>();
  for (const list of lists) {
    for (const chunk of list) {
      const existing = best.get(chunk.id);
      if (!existing || chunk.similarity > existing.similarity) best.set(chunk.id, chunk);
    }
  }
  return [...best.values()].sort((a, b) => b.similarity - a.similarity);
}

async function vectorSearch(
  vector: number[],
  config: RetrievalConfig,
): Promise<RetrievedChunk[]> {
  const { data, error } = await db().rpc("match_chunks", {
    query_embedding: JSON.stringify(vector),
    match_count: config.topK,
    similarity_threshold: config.similarityThreshold,
  });

  if (error) throw new Error(`match_chunks failed: ${error.message}`);

  return (data ?? []).map(
    (row: {
      id: string;
      document_id: string;
      document_title: string;
      source_url: string | null;
      content: string;
      lang: Lang;
      chunk_index: number;
      similarity: number;
    }) => ({
      id: row.id,
      documentId: row.document_id,
      documentTitle: row.document_title,
      sourceUrl: row.source_url,
      content: row.content,
      lang: row.lang,
      chunkIndex: row.chunk_index,
      similarity: row.similarity,
    }),
  );
}

/**
 * Finds the passages that should ground an answer.
 *
 * The shape of this is the result of measuring rather than of taste. Cosine
 * distance turned out to be a poor gate: it ranked correctly in every case
 * tested and still put correct answers below any threshold that also excluded
 * wrong ones — including in English, where "Where should I start?" scored 0.28
 * against the passage that answers it. So distance is used only to gather
 * candidates, and the reranker decides what the model actually sees.
 */
export async function search(
  rawQuery: string,
  queryLang: Lang,
  config: RetrievalConfig,
  translationModel: string,
): Promise<SearchResult> {
  const query = normalizeQuery(rawQuery, queryLang);

  let translatedQuery: string | null = null;
  let translationError: string | null = null;

  if (config.dualEmbedQueries) {
    const kbLang = await dominantKbLang();
    if (kbLang !== queryLang) {
      try {
        translatedQuery = await translateForSearch(query, queryLang, kbLang, translationModel);
      } catch (error) {
        // Retrieval still works without the translation, just less well. A
        // failed translation must not fail the whole answer — but it is
        // recorded, because a persistently failing translation looks exactly
        // like a bot that has quietly got worse at Persian.
        translationError = error instanceof Error ? error.message : String(error);
      }
    }
  }

  const queries = [query, ...(translatedQuery ? [translatedQuery] : [])];
  const vectors = await embed(queries, "query", config);
  const candidates = mergeByBestScore(
    await Promise.all(vectors.map((vector) => vectorSearch(vector, config))),
  );

  if (candidates.length === 0) {
    return { chunks: [], candidates, translatedQuery, translationError };
  }

  if (!config.rerankerEnabled) {
    return { chunks: candidates, candidates, translatedQuery, translationError };
  }

  // The reranker takes the same cross-lingual hit the embedding model does.
  // Scoring this site's English passages against a Persian question and against
  // its English rendering, the English phrasing came out 1.2 to 1.8 times
  // higher on every passage — enough to move a correct chunk from below the
  // threshold to above it.
  //
  // So both phrasings are scored and the better one is kept. Reranking with
  // only the translation would be worse: a machine translation drops detail,
  // and the question as the person actually asked it is the one that has to be
  // answered.
  const texts = candidates.map((c) => c.content);
  const scoreLists = await Promise.all(
    [query, ...(translatedQuery ? [translatedQuery] : [])].map((q) =>
      rerank(q, texts, config),
    ),
  );

  const bestRelevance = new Map<number, number>();
  for (const list of scoreLists) {
    for (const { index, relevance } of list) {
      bestRelevance.set(index, Math.max(bestRelevance.get(index) ?? 0, relevance));
    }
  }

  const scored = candidates
    .map((chunk, index) => ({ ...chunk, relevance: bestRelevance.get(index) ?? 0 }))
    .sort((a, b) => b.relevance - a.relevance);

  return {
    // Threshold first, then cap. The threshold answers "is this related at
    // all"; the cap answers "how much of it is worth reading". Without the cap
    // a vague question keeps everything, because a vague question scores
    // everything alike.
    chunks: scored
      .filter((c) => c.relevance >= config.rerankThreshold)
      .slice(0, config.maxContextChunks),
    candidates: scored,
    translatedQuery,
    translationError,
  };
}
