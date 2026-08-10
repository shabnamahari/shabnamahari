/**
 * Splitting a document into the pieces that get embedded.
 *
 * Boundaries land on paragraphs, never mid-sentence. A chunk cut through the
 * middle of a claim embeds as something neither half means, and when it is
 * retrieved the model reads a fragment and fills in the rest — which in this
 * project is the failure that matters, because the brand's whole position is
 * that it does not guess.
 */

export type Chunk = {
  content: string;
  index: number;
  tokenCount: number;
};

/**
 * Token estimate without a tokenizer.
 *
 * Real counts differ per model and Persian tokenizes worse than English, so
 * this is deliberately a rough upper bound rather than a precise figure. It is
 * used to decide where to cut, not to bill anything — the actual token usage
 * that gets logged comes back from the provider.
 */
export function estimateTokens(text: string): number {
  const persian = (text.match(/[؀-ۿ]/g) ?? []).length;
  const rest = text.length - persian;
  // Persian runs closer to two characters per token in most tokenizers; Latin
  // text is nearer four.
  return Math.ceil(persian / 2 + rest / 4);
}

/**
 * Splits text into chunks of roughly `targetTokens`, overlapping by
 * `overlapTokens`.
 *
 * The overlap exists so a claim that straddles a boundary survives in at least
 * one chunk whole. Without it, the sentence that answers a question is the one
 * most likely to be cut in half, because boundaries fall between topics and
 * that is exactly where questions point.
 */
export function chunkText(
  text: string,
  targetTokens: number,
  overlapTokens: number,
): Chunk[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return [];

  const chunks: Chunk[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  const flush = () => {
    if (current.length === 0) return;
    const content = current.join("\n\n");
    chunks.push({
      content,
      index: chunks.length,
      tokenCount: estimateTokens(content),
    });
  };

  for (const paragraph of paragraphs) {
    const tokens = estimateTokens(paragraph);

    // A single paragraph over budget becomes its own chunk rather than being
    // split. Cutting inside it would break the sentence rule, and one oversized
    // chunk costs a little context; a severed one costs correctness.
    if (tokens > targetTokens) {
      flush();
      current = [];
      currentTokens = 0;
      chunks.push({
        content: paragraph,
        index: chunks.length,
        tokenCount: tokens,
      });
      continue;
    }

    if (currentTokens + tokens > targetTokens && current.length > 0) {
      flush();

      // Carry whole paragraphs backwards until the overlap budget is used up,
      // so the next chunk opens with the context the previous one closed on.
      const carried: string[] = [];
      let carriedTokens = 0;
      for (let i = current.length - 1; i >= 0; i--) {
        const t = estimateTokens(current[i]);
        if (carriedTokens + t > overlapTokens) break;
        carried.unshift(current[i]);
        carriedTokens += t;
      }

      current = carried;
      currentTokens = carriedTokens;
    }

    current.push(paragraph);
    currentTokens += tokens;
  }

  flush();
  return chunks;
}
