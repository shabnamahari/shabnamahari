/**
 * The vocabulary the brain speaks. Nothing in here knows about HTTP, React, or
 * Telegram — a channel translates its own input into these types, and renders
 * these types back out.
 */

export type Lang = "en" | "fa";

export type Channel = "web" | "widget" | "telegram";

/** A chunk that survived retrieval, with the score that got it there. */
export type RetrievedChunk = {
  id: string;
  documentId: string;
  documentTitle: string;
  sourceUrl: string | null;
  content: string;
  lang: Lang;
  chunkIndex: number;
  /** Cosine similarity from the vector search. */
  similarity: number;
  /** Reranker score, when the reranker ran. This is what decides inclusion. */
  relevance?: number;
};

/**
 * What the answer was grounded in, shown to the reader.
 *
 * Carries `lang` because a Persian answer may well be built from an English
 * page, and the citation has to say so rather than quietly implying the source
 * was Persian.
 */
export type Citation = {
  documentId: string;
  title: string;
  url: string | null;
  lang: Lang;
};

export type ConverseInput = {
  channel: Channel;
  /** The channel's own id for this person: a Telegram chat id, a web cookie. */
  externalUserId: string;
  text: string;
  /** Omit to start a new conversation. */
  conversationId?: string;
  /**
   * Set only by an explicit act — the language toggle, or `/lang`. It wins
   * unconditionally, which is why it is separate from the language the brain
   * infers from the message text.
   */
  forceLang?: Lang;
};

/**
 * The brain emits a stream of these. Every channel consumes the same sequence;
 * what differs is only how it is rendered — tokens into a div, or edits to a
 * Telegram message.
 */
export type ConverseEvent =
  | { type: "conversation"; conversationId: string; lang: Lang }
  /** Emitted before the first token so sources can render while the answer types. */
  | { type: "sources"; citations: Citation[] }
  | { type: "delta"; text: string }
  /**
   * A tool ran. Emitted so a channel can show what the bot *did* rather than
   * only what it said — the panel's inbox needs this to explain why a lead
   * exists, and its absence is how a turn where the bot claimed to record a
   * phone number and did not looks identical to one where it worked.
   */
  | { type: "tool"; name: string; arguments: string; result: string }
  | {
      type: "done";
      messageId: string;
      model: string;
      /** True when the primary model failed and the fallback answered. */
      usedFallback: boolean;
      tokensIn: number;
      tokensOut: number;
      costUsd: number;
    }
  | { type: "error"; message: string };

/** Resolved configuration for one turn, read from the database. */
export type RetrievalConfig = {
  provider: "cohere" | "openai" | "google" | "voyage";
  model: string;
  dimensions: number;
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  similarityThreshold: number;
  rerankerEnabled: boolean;
  rerankerModel: string | null;
  rerankThreshold: number;
  maxContextChunks: number;
  dualEmbedQueries: boolean;
};

export type ModelConfig = {
  activeModel: string;
  fallbackModel: string | null;
  temperature: number | null;
  maxTokens: number;
  topP: number | null;
};
