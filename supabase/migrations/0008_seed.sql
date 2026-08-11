-- 0008 — initial configuration
--
-- Idempotent: every insert either does nothing or updates in place, so running
-- the migration set twice does not duplicate configuration or overwrite a value
-- Shabnam has since changed in the panel.

-- ---------------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------------

insert into settings (key, value, description) values
  (
    'placement_url',
    '"/work/ielts/placement-assessment"'::jsonb,
    'Where the bot sends someone who wants to start. Kept here rather than in code so the address can change without a deploy.'
  ),
  (
    'bot_name',
    '{"en": "Sir Cue", "fa": "Sir Cue"}'::jsonb,
    'Treated like the tagline: a fixed mark that keeps its Latin form inside Persian copy. The eval suite allows it through the no-Latin-in-Persian check.'
  ),
  (
    'tagline',
    '"Your goal speaks English."'::jsonb,
    'Never translated, in either direction. A Persian rendering exists and is deliberately not used.'
  ),
  (
    'contact_handoff_note',
    '{"en": "", "fa": ""}'::jsonb,
    'How the bot describes reaching Shabnam directly. Empty until the real wording is written.'
  ),
  (
    'widget_allowed_origins',
    '[]'::jsonb,
    'Domains permitted to embed the widget. Empty means the widget serves nobody, which is the right default before launch.'
  )
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Embeddings and retrieval
--
-- Cohere embed-v4.0 at 1024 dimensions. 1024 rather than the model's maximum
-- because it matches embed-multilingual-v3.0's width — so if the model ever has
-- to change between those two, the column and its index survive and only the
-- vectors need rebuilding.
-- ---------------------------------------------------------------------------

insert into embedding_config (
  provider, model, dimensions,
  chunk_size, chunk_overlap,
  top_k, similarity_threshold,
  reranker_enabled, dual_embed_queries
)
select 'cohere', 'embed-v4.0', 1024, 500, 50, 8, 0.35, false, true
where not exists (select 1 from embedding_config);

-- ---------------------------------------------------------------------------
-- Model
--
-- `anthropic/claude-haiku-4.5` is the default named in the build prompt. The
-- fallback is left null on purpose: its slug has to come from the live
-- catalogue at GET /api/v1/models, not from memory, and the brain refuses to
-- start until it is set.
-- ---------------------------------------------------------------------------

insert into model_config (channel, active_model, fallback_model, max_tokens)
select null, 'anthropic/claude-haiku-4.5', null, 1024
where not exists (select 1 from model_config where channel is null);

-- The five models pinned above the full catalogue for one-click switching.
-- Display names only — each `slug` is resolved against the live catalogue and
-- confirmed before it is written.
insert into pinned_models (display_name, slug, sort_order) values
  ('Gemini 3.5 Flash',      null, 1),
  ('Gemini 3.1 Flash Lite', null, 2),
  ('Gemini 2.5 Flash',      null, 3),
  ('Haiku 4.5',             'anthropic/claude-haiku-4.5', 4),
  ('GPT-5 mini',            null, 5)
on conflict (sort_order) do nothing;

-- ---------------------------------------------------------------------------
-- Budget
--
-- $50 a month, warn at 80%, and at 100% switch to a cheaper model rather than
-- going silent. `over_cap_model` is null for the same reason as the fallback
-- above; until it is set, reaching the cap warns instead of switching.
-- ---------------------------------------------------------------------------

insert into budget_config (monthly_cap_usd, warn_at, over_cap_model)
select 50.00, 0.80, null
where not exists (select 1 from budget_config);
