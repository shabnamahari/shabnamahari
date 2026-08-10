import "server-only";

import type { RetrievalConfig } from "../types";
import type { EmbedPurpose } from "./index";

const API = "https://api.cohere.com/v2";

/** Cohere's own limit on texts per embed call. */
const BATCH_SIZE = 96;

function apiKey(): string {
  const key = process.env.COHERE_API_KEY;
  if (!key) throw new Error("COHERE_API_KEY is not set.");
  return key;
}

/**
 * Cohere's trial key allows ten calls a minute, and one search spends four of
 * them: two embeddings, and two rerank passes for the two phrasings of the
 * question. Three searches in quick succession is enough to hit it.
 *
 * So calls are spaced rather than merely retried. A 429 from a rate limit is
 * not an error to recover from, it is a queue to join — and discovering that
 * only after failing wastes the call that failed.
 */
const RATE_LIMIT_PER_MINUTE = 9;
const MIN_GAP_MS = Math.ceil(60_000 / RATE_LIMIT_PER_MINUTE);

let nextSlot = 0;

async function takeSlot(): Promise<void> {
  const now = Date.now();
  const slot = Math.max(now, nextSlot);
  nextSlot = slot + MIN_GAP_MS;
  if (slot > now) await new Promise((resolve) => setTimeout(resolve, slot - now));
}

const MAX_ATTEMPTS = 4;

async function call(path: string, body: unknown): Promise<unknown> {
  let lastDetail = "";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    await takeSlot();

    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) return res.json();

    lastDetail = await res.text().catch(() => "");

    // 429 and 5xx are worth waiting out. Anything else — a bad model name, a
    // dimension the model does not offer — fails the same way however long you
    // wait, and retrying it just spends the quota that the next real call needs.
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === MAX_ATTEMPTS - 1) {
      throw new Error(
        `Cohere ${path} failed: HTTP ${res.status} ${lastDetail.slice(0, 300)}`,
      );
    }

    const retryAfter = Number(res.headers.get("retry-after"));
    const backoff = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : MIN_GAP_MS * 2 ** attempt;

    // Push the whole queue back, not just this call: a 429 means the window is
    // full, and letting the next queued call go at its original slot would just
    // spend another attempt on the same refusal.
    nextSlot = Math.max(nextSlot, Date.now() + backoff);
    await new Promise((resolve) => setTimeout(resolve, backoff));
  }

  throw new Error(`Cohere ${path} failed after ${MAX_ATTEMPTS} attempts: ${lastDetail}`);
}

export async function embedWithCohere(
  texts: string[],
  purpose: EmbedPurpose,
  config: RetrievalConfig,
): Promise<number[][]> {
  const out: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const body = (await call("/embed", {
      model: config.model,
      input_type: purpose === "query" ? "search_query" : "search_document",
      embedding_types: ["float"],
      // Asked for explicitly rather than taking the model's default, because
      // it has to match the width of the `chunks.embedding` column exactly.
      output_dimension: config.dimensions,
      texts: batch,
    })) as { embeddings?: { float?: number[][] } };

    const vectors = body.embeddings?.float;
    if (!vectors || vectors.length !== batch.length) {
      throw new Error(
        `Cohere returned ${vectors?.length ?? 0} vectors for ${batch.length} texts`,
      );
    }

    // A width mismatch here would be caught by Postgres on insert anyway, but
    // the error it raises names neither the model nor the configured
    // dimension, which makes it a slow thing to diagnose.
    if (vectors[0].length !== config.dimensions) {
      throw new Error(
        `${config.model} returned ${vectors[0].length}-dimensional vectors, ` +
          `but embedding_config says ${config.dimensions} and the chunks column ` +
          `is built for that width.`,
      );
    }

    out.push(...vectors);
  }

  return out;
}

export async function rerankWithCohere(
  query: string,
  documents: string[],
  model: string,
): Promise<{ index: number; relevance: number }[]> {
  const body = (await call("/rerank", {
    model,
    query,
    documents,
    top_n: documents.length,
  })) as { results?: { index: number; relevance_score: number }[] };

  return (body.results ?? []).map((r) => ({
    index: r.index,
    relevance: r.relevance_score,
  }));
}
