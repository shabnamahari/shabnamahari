-- 0005 — everything the panel can change without a deploy
--
-- The rule behind this file: if a value would otherwise be a constant in the
-- code that Shabnam might want to change, it belongs here instead. That covers
-- the system prompt, the model, the retrieval knobs, and the placement URL.

-- ---------------------------------------------------------------------------
-- Loose key/value settings
--
-- For single values with no schema of their own: URLs, the bot's name, the
-- budget cap. Anything with more than a couple of fields gets a real table.

create table settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- System prompt, versioned per language
--
-- Read from here at request time, never hardcoded. Two independent version
-- histories, because the Persian prompt carries rules the English one does not
-- (no Latin script mid-sentence, «شما» then «تو») and editing one must not
-- silently reset the other.

create table prompt_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  lang lang not null,
  content text not null,
  -- Persona notes kept beside the prompt so a rollback restores both together.
  persona text,
  is_active boolean not null default false,
  -- Monotonic per language, so the panel can show "v4" rather than a timestamp.
  version integer not null,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid,

  unique (lang, version)
);

-- Exactly one active prompt per language, enforced by the database rather than
-- by the code that writes it. Two active Persian prompts is not a state the
-- brain can resolve, so it must not be representable.
create unique index prompt_versions_one_active_per_lang
  on prompt_versions (lang)
  where is_active;

-- ---------------------------------------------------------------------------
-- Welcome message and quick replies, per language and channel
--
-- Separate from the prompt: these are strings shown to a person before the
-- model is involved at all, and the widget's welcome differs from the full
-- page's. Suggested questions come from the brand guide's approved lines.

create table channel_copy (
  id uuid primary key default extensions.gen_random_uuid(),
  channel channel not null,
  lang lang not null,
  welcome text not null,
  quick_replies text[] not null default '{}',
  updated_at timestamptz not null default now(),

  unique (channel, lang)
);

-- ---------------------------------------------------------------------------
-- Which model answers, and what happens when it can't
--
-- One row per channel, so Telegram can run a cheaper model than the full page
-- if that ever makes sense. A row with channel = null is the default that
-- applies to any channel without its own row.

create table model_config (
  id uuid primary key default extensions.gen_random_uuid(),
  channel channel,
  -- OpenRouter slug, e.g. `anthropic/claude-haiku-4.5`. Never written from
  -- memory in code — the panel populates it from the live catalogue at
  -- GET /api/v1/models, which is also where the displayed price comes from.
  active_model text not null,
  -- Used when the primary model errors or is rate-limited. Distinct from the
  -- budget fallback below: this one covers failure, that one covers spend.
  --
  -- Nullable in the schema only because its slug cannot be written from memory
  -- — it is filled in once the live catalogue has been read. The brain refuses
  -- to start without it, so "null" means unconfigured, not optional. The check
  -- below stops the obvious mistake of pointing it at the model it is meant to
  -- rescue.
  fallback_model text,
  constraint model_config_fallback_differs
    check (fallback_model is null or fallback_model <> active_model),
  -- Nullable because several current models reject sampling parameters
  -- outright; null means "don't send it".
  temperature numeric(3, 2),
  max_tokens integer not null default 1024,
  top_p numeric(3, 2),
  -- Optional day-of-week schedule for switching models, as described in panel
  -- section 03. Null means the model never changes on a timer.
  schedule jsonb,
  updated_at timestamptz not null default now()
);

-- One row per channel, and at most one default row. `nulls not distinct` is
-- what makes the second half work: by default Postgres treats every null as
-- unique, so a plain unique index would happily admit five default rows.
create unique index model_config_channel_key
  on model_config (channel)
  nulls not distinct;

-- The five models pinned above the full catalogue in the panel, for one-click
-- switching. `slug` is filled in once the live catalogue has been read and the
-- names confirmed; until then a row can hold the display name alone.
create table pinned_models (
  id uuid primary key default extensions.gen_random_uuid(),
  display_name text not null,
  slug text,
  -- Not called `position`: that is a SQL function name, and while Postgres
  -- accepts it as a column it parses badly in exactly the places this column is
  -- used, such as `on conflict (position)`.
  sort_order integer not null,
  created_at timestamptz not null default now(),

  unique (sort_order)
);

-- ---------------------------------------------------------------------------
-- Retrieval and embedding knobs
--
-- Single row. `dimensions` is the one field that cannot be changed freely:
-- it must match the `chunks.embedding` column, and changing it means calling
-- `resize_embeddings` and re-embedding the entire knowledge base.

create table embedding_config (
  id uuid primary key default extensions.gen_random_uuid(),
  provider embedding_provider not null,
  model text not null,
  dimensions integer not null,
  chunk_size integer not null default 500,
  chunk_overlap integer not null default 50,
  top_k integer not null default 8,
  similarity_threshold double precision not null default 0.35,
  reranker_enabled boolean not null default false,
  reranker_model text,
  -- Whether to embed each question twice — once as asked, once translated into
  -- the knowledge base's dominant language — and merge the results. Not
  -- optional in practice: the knowledge base is mostly English and a large share
  -- of questions arrive in Persian.
  dual_embed_queries boolean not null default true,
  updated_at timestamptz not null default now(),

  -- Configuration, not records: a second row would make "which settings are
  -- live" ambiguous. A column pinned to one value and made unique is the
  -- portable way to say "at most one row" — an index on a bare constant
  -- expression is not accepted.
  singleton boolean not null default true,
  constraint embedding_config_singleton unique (singleton),
  constraint embedding_config_singleton_true check (singleton)
);

-- ---------------------------------------------------------------------------
-- Spend
--
-- Behaviour at the cap is a switch to a cheaper model, never a shutdown. A bot
-- that goes silent looks broken; a bot on a weaker model still answers.

create table budget_config (
  id uuid primary key default extensions.gen_random_uuid(),
  monthly_cap_usd numeric(10, 2) not null,
  -- Fraction of the cap at which the warning fires, e.g. 0.80.
  warn_at numeric(3, 2) not null default 0.80,
  -- The model used once the cap is reached. Left null until the live catalogue
  -- has been read, since its slug must not be written from memory.
  over_cap_model text,
  -- Set while the cap is in force, cleared when the month rolls over. Lets the
  -- panel show "currently on the fallback model" without recomputing spend.
  capped_since timestamptz,
  updated_at timestamptz not null default now(),

  singleton boolean not null default true,
  constraint budget_config_singleton unique (singleton),
  constraint budget_config_singleton_true check (singleton)
);
