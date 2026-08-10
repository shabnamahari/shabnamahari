-- 0009 — retrieve on rank, not on a raw distance
--
-- The seeded configuration assumed one cosine threshold could decide what
-- reaches the model. Measuring it against embed-v4.0 with real site copy showed
-- that it cannot, for two separate reasons.
--
-- 1. A Persian question scores far lower than its English twin against the same
--    English passage — 0.36 against 0.58 for the same question about Band 7.
--    A threshold tuned on English silently discards correct Persian matches.
--    Embedding the question twice, once translated, closes most of that gap
--    (0.36 → 0.57, 0.35 → 0.49), which is why `dual_embed_queries` is not
--    optional here.
--
-- 2. Even in English, a vague-but-answerable question scores low. "Where should
--    I start?" against the placement passage came out at 0.28 — correctly
--    ranked first, and still below a 0.35 gate. The ranking was right in every
--    case tested; the gate was what threw the answer away.
--
-- So cosine becomes a recall floor rather than a decision, and the reranker
-- makes the actual call. On the same questions the reranker separated cleanly:
-- correct passages at 0.13–0.45, wrong ones at 0.02–0.07, and a question whose
-- answer is genuinely absent from the knowledge base topped out at 0.03 — which
-- is the case that has to produce "I don't know" rather than an invented answer.

alter table embedding_config
  -- What the reranker must score for a chunk to reach the model. Provisional:
  -- derived from four questions against three passages, sitting between the
  -- weakest correct match (0.125) and the strongest wrong one (0.067). The eval
  -- suite in phase 3 retunes it against the real crawled site.
  add column rerank_threshold double precision not null default 0.10;

comment on column embedding_config.similarity_threshold is
  'Recall floor for the vector search, not the keep/discard decision. Set low on purpose: its job is to drop obvious noise before reranking, and anything it drops the reranker never gets to see.';

comment on column embedding_config.rerank_threshold is
  'The actual keep/discard decision. Below this, the bot says it does not know and the question is logged to `unanswered`.';

update embedding_config
set
  -- Was 0.35, which discarded correct Persian matches outright.
  similarity_threshold = 0.15,
  -- Retrieve wider than we intend to use, then let the reranker cut it down.
  top_k = 20,
  reranker_enabled = true,
  reranker_model = 'rerank-v3.5',
  updated_at = now();
