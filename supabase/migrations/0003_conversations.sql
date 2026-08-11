-- 0003 — people, conversations, messages
--
-- One person may reach the bot through the site, the widget and Telegram. They
-- are the same person, so identity lives in `unified_users` and each channel
-- only supplies an external id to map onto it.

create table unified_users (
  id uuid primary key default extensions.gen_random_uuid(),
  channel channel not null,
  -- The id that channel knows them by: a Telegram chat_id, or a cookie-backed
  -- anonymous id for web and widget.
  external_id text not null,
  name text,
  -- A hint carried across conversations, not a lock. The first full sentence a
  -- person types still wins over it.
  preferred_lang lang,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),

  unique (channel, external_id)
);

-- ---------------------------------------------------------------------------

create table conversations (
  id uuid primary key default extensions.gen_random_uuid(),
  channel channel not null,
  user_id uuid references unified_users (id) on delete set null,
  -- Denormalised from unified_users so a conversation can be created before the
  -- user row exists, and survives that row being cleared under a data-retention
  -- policy.
  external_user_id text,
  -- The language the conversation is currently being conducted in. Sticky, not
  -- locked: a full sentence in the other language moves it, a stray word does
  -- not. Starts at 'en' because English is the primary language.
  lang lang not null default 'en',
  -- Persian only. The brand guide addresses people as «شما» on first contact and
  -- «تو» thereafter, so this flips once the bot has answered. Meaningless for
  -- English, where the pronoun is always `you`.
  fa_informal boolean not null default false,
  status conversation_status not null default 'open',
  -- Rolling summary of turns already dropped from the live context window,
  -- written in the language of the conversation.
  summary text,
  -- Set the first time `share_placement_link` fires, so the CTA cannot repeat
  -- within one conversation. Section 02 treats a repeated CTA as the thing the
  -- brand guide calls "being a salesperson".
  placement_link_sent_at timestamptz,
  started_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index conversations_user_id_idx on conversations (user_id);
create index conversations_status_idx on conversations (status);
create index conversations_channel_idx on conversations (channel);
create index conversations_started_at_idx on conversations (started_at desc);

-- ---------------------------------------------------------------------------

create table messages (
  id uuid primary key default extensions.gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  role message_role not null,
  content text not null,
  -- Per message, not per conversation. A Persian message inside an English
  -- conversation renders right-to-left in Vazirmatn; locking direction on the
  -- container is what makes that impossible.
  lang lang not null,
  -- Null for user messages. Recorded per message rather than per conversation
  -- because the active model can change mid-conversation — a budget cap being
  -- reached, or a fallback firing.
  model_used text,
  tokens_in integer,
  tokens_out integer,
  -- Cost in USD for this single call, computed from the live catalogue price at
  -- the time of the call. Stored rather than derived, because the catalogue
  -- price changes and a historical cost must not move with it.
  cost numeric(12, 8),
  -- The chunks that grounded this answer. Kept so the panel can show, for any
  -- past answer, exactly what the model was looking at.
  retrieved_chunk_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index messages_conversation_id_idx on messages (conversation_id, created_at);
create index messages_created_at_idx on messages (created_at desc);
create index messages_model_used_idx on messages (model_used) where model_used is not null;
