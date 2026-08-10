-- 0016 — a ceiling on how many passages reach the model
--
-- A threshold alone turned out not to be a filter. Asked "Where should I
-- start?", retrieval kept all twenty candidates: the question is vague enough
-- that everything scores similarly, and everything cleared 0.10.
--
-- Twenty passages is not grounding, it is noise with citations. The model reads
-- the lot, most of it irrelevant, and the answer drifts toward whatever the
-- bulk of the context happens to be about.
--
-- So the threshold keeps its job — dropping what is clearly unrelated — and a
-- separate cap decides how much of what survives is actually worth showing. Six
-- is enough to cover a question answered across two or three documents, and
-- small enough that a weak sixth cannot outweigh a strong first.

alter table embedding_config
  add column max_context_chunks integer not null default 6;

comment on column embedding_config.max_context_chunks is
  'How many reranked passages reach the model. The threshold decides what is relevant at all; this decides how much relevance is useful. Raising it past about eight buys little and dilutes the strongest match.';
