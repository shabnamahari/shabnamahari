import "server-only";

import { db } from "@/lib/chatbot/db/client";
import type { Channel, Lang, ModelConfig, RetrievalConfig } from "./types";

/**
 * Reads the settings the panel owns.
 *
 * Nothing here is cached across requests. These are small single-row reads
 * against a database in the same region, and caching them would mean a model
 * or prompt change in the panel takes effect at some unpredictable later
 * moment — which defeats the reason they live in the database at all.
 */

export async function getRetrievalConfig(): Promise<RetrievalConfig> {
  const { data, error } = await db()
    .from("embedding_config")
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`embedding_config is missing: ${error?.message ?? "no row"}`);
  }

  return {
    provider: data.provider,
    model: data.model,
    dimensions: data.dimensions,
    chunkSize: data.chunk_size,
    chunkOverlap: data.chunk_overlap,
    topK: data.top_k,
    similarityThreshold: data.similarity_threshold,
    rerankerEnabled: data.reranker_enabled,
    rerankerModel: data.reranker_model,
    rerankThreshold: data.rerank_threshold,
    maxContextChunks: data.max_context_chunks,
    dualEmbedQueries: data.dual_embed_queries,
  };
}

/**
 * The model for a channel, falling back to the default row.
 *
 * Refuses to return a configuration without a fallback model. The column is
 * nullable only because its slug had to come from the live catalogue rather
 * than from memory; a null here at runtime means someone left the setup
 * half-finished, and discovering that when the primary model first errors is
 * the worst possible moment.
 */
export async function getModelConfig(channel: Channel): Promise<ModelConfig> {
  const { data, error } = await db()
    .from("model_config")
    .select("*")
    .or(`channel.eq.${channel},channel.is.null`)
    // `channel` sorts nulls last under ascending order, so a channel-specific
    // row wins over the default when both exist.
    .order("channel", { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`model_config read failed: ${error.message}`);
  if (!data) throw new Error("model_config has no row for this channel and no default");

  if (!data.fallback_model) {
    throw new Error(
      "model_config.fallback_model is not set. Pick one from the live OpenRouter " +
        "catalogue — preferably from a different provider than the primary model, " +
        "so one provider's outage does not take both down.",
    );
  }

  return {
    activeModel: data.active_model,
    fallbackModel: data.fallback_model,
    temperature: data.temperature,
    maxTokens: data.max_tokens,
    topP: data.top_p,
  };
}

/** A single `settings` row, or null when the key has never been written. */
export async function getSetting<T = unknown>(key: string): Promise<T | null> {
  const { data, error } = await db()
    .from("settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) throw new Error(`settings["${key}"] read failed: ${error.message}`);
  return (data?.value as T) ?? null;
}

/**
 * The active system prompt for a language.
 *
 * Returns null rather than falling back to the other language's prompt. A
 * Persian conversation answered under the English prompt would lose the rules
 * that only exist on the Persian side — no Latin script mid-sentence, «شما»
 * then «تو» — and would do it silently.
 */
export async function getActivePrompt(lang: Lang): Promise<string | null> {
  const { data, error } = await db()
    .from("prompt_versions")
    .select("content")
    .eq("lang", lang)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(`prompt_versions read failed: ${error.message}`);
  return data?.content ?? null;
}
