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

async function call(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Cohere ${path} failed: HTTP ${res.status} ${detail.slice(0, 300)}`);
  }

  return res.json();
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
