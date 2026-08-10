import "server-only";

import { db } from "@/lib/chatbot/db/client";
import { embed } from "../embed";
import { getRetrievalConfig } from "../config";
import type { Lang } from "../types";
import { chunkText } from "./chunk";
import { detectDocumentLang } from "./lang";
import { normalizeText } from "./normalize";

export type SourceType = "url" | "pdf" | "docx" | "text";

export type IngestInput = {
  title: string;
  text: string;
  sourceType: SourceType;
  sourceUrl?: string;
  tags?: string[];
  /** Overrides detection. Only pass this when the operator stated the language. */
  lang?: Lang;
};

export type IngestResult = {
  documentId: string;
  lang: Lang;
  chunks: number;
  replaced: boolean;
};

/**
 * Puts one document into the knowledge base: clean, chunk, embed, store.
 *
 * Re-ingesting the same URL replaces it rather than adding a second copy. That
 * is what makes "re-crawl after a deploy" safe to run as often as you like —
 * and a knowledge base that accumulated a new copy of every page on each crawl
 * would return the same passage several times and crowd out everything else.
 */
export async function ingestDocument(input: IngestInput): Promise<IngestResult> {
  const config = await getRetrievalConfig();
  const supabase = db();

  const lang = input.lang ?? detectDocumentLang(input.text);
  const text = normalizeText(input.text, lang);

  if (text.length === 0) {
    throw new Error(`"${input.title}" extracted to nothing`);
  }

  // Find an existing row for this URL before writing, so the replacement is
  // visible as a replacement rather than as a delete followed by an unrelated
  // insert.
  let existingId: string | null = null;
  if (input.sourceUrl) {
    const { data } = await supabase
      .from("documents")
      .select("id")
      .eq("source_url", input.sourceUrl)
      .maybeSingle();
    existingId = data?.id ?? null;
  }

  const row = {
    title: input.title,
    lang,
    source_type: input.sourceType,
    source_url: input.sourceUrl ?? null,
    tags: input.tags ?? [],
    raw_text: text,
    // Held back from retrieval until the chunks and their embeddings are in
    // place. `match_chunks` only reads `ready` documents, so a crawl that dies
    // half way leaves the old answers standing rather than serving fragments.
    status: "processing" as const,
    error: null,
    updated_at: new Date().toISOString(),
  };

  let documentId: string;
  if (existingId) {
    const { error } = await supabase.from("documents").update(row).eq("id", existingId);
    if (error) throw new Error(`document update failed: ${error.message}`);
    documentId = existingId;

    // The old chunks belong to the old text. Removing them here rather than
    // relying on the cascade keeps the document row — and its id — stable, so
    // anything referencing it still resolves.
    const { error: delError } = await supabase
      .from("chunks")
      .delete()
      .eq("document_id", documentId);
    if (delError) throw new Error(`old chunk removal failed: ${delError.message}`);
  } else {
    const { data, error } = await supabase
      .from("documents")
      .insert(row)
      .select("id")
      .single();
    if (error || !data) throw new Error(`document insert failed: ${error?.message}`);
    documentId = data.id;
  }

  try {
    const chunks = chunkText(text, config.chunkSize, config.chunkOverlap);
    if (chunks.length === 0) throw new Error("chunking produced nothing");

    const vectors = await embed(
      chunks.map((c) => c.content),
      "document",
      config,
    );

    const { error } = await supabase.from("chunks").insert(
      chunks.map((chunk, i) => ({
        document_id: documentId,
        content: chunk.content,
        lang,
        // pgvector accepts the literal form over the wire; an array would be
        // sent as a Postgres array and rejected as the wrong type.
        embedding: JSON.stringify(vectors[i]),
        token_count: chunk.tokenCount,
        chunk_index: chunk.index,
      })),
    );
    if (error) throw new Error(`chunk insert failed: ${error.message}`);

    await supabase.from("documents").update({ status: "ready" }).eq("id", documentId);

    return { documentId, lang, chunks: chunks.length, replaced: Boolean(existingId) };
  } catch (error) {
    // Record why, and leave the document out of retrieval. The panel reads this
    // column so a failed upload explains itself without a log dive.
    await supabase
      .from("documents")
      .update({
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      })
      .eq("id", documentId);
    throw error;
  }
}
