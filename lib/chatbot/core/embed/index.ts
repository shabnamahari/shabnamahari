import "server-only";

import type { RetrievalConfig } from "../types";
import { embedWithCohere, rerankWithCohere } from "./cohere";

/**
 * Embedding is behind an interface because the provider is a panel setting, and
 * because changing it is the single most expensive change in this system: the
 * `chunks.embedding` column has a fixed width, so a new model means resizing
 * the column, dropping the index, and re-embedding the entire knowledge base.
 *
 * Only Cohere is implemented. The other three sit in `embedding_provider` as
 * choices the panel can offer, and each throws here until someone writes it —
 * a loud failure at the moment of switching, rather than a silent fallback to
 * a provider the operator did not choose.
 */

/**
 * Cohere and every other provider distinguish these two, and using the wrong
 * one costs real recall: a question and a passage are embedded into different
 * regions on purpose, so that short questions land near the long answers they
 * are asking about rather than near other short questions.
 */
export type EmbedPurpose = "document" | "query";

export async function embed(
  texts: string[],
  purpose: EmbedPurpose,
  config: RetrievalConfig,
): Promise<number[][]> {
  if (texts.length === 0) return [];

  switch (config.provider) {
    case "cohere":
      return embedWithCohere(texts, purpose, config);
    case "openai":
    case "google":
    case "voyage":
      throw new Error(
        `embedding provider "${config.provider}" is selected in embedding_config ` +
          `but has no implementation. Add one, or switch the provider back.`,
      );
  }
}

/**
 * Rescores candidates against the question.
 *
 * Separate from embedding because it answers a different question. Vector
 * search asks "what is near this?", which is cheap and approximate; the
 * reranker reads the question and the passage together and asks "does this
 * actually answer it?", which is what decides whether the bot speaks or says it
 * does not know.
 */
export async function rerank(
  query: string,
  documents: string[],
  config: RetrievalConfig,
): Promise<{ index: number; relevance: number }[]> {
  if (documents.length === 0) return [];
  if (!config.rerankerModel) {
    throw new Error("reranker_enabled is true but reranker_model is not set");
  }

  switch (config.provider) {
    case "cohere":
      return rerankWithCohere(query, documents, config.rerankerModel);
    default:
      throw new Error(`no reranker implemented for provider "${config.provider}"`);
  }
}
