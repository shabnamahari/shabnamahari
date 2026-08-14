-- 0026 — replying from the phone
--
-- Shabnam's decision, asked and answered: when she takes a conversation over
-- she answers from Telegram, not from the panel. The constraint that made it
-- the right one is that she cannot reach these people directly — somebody who
-- messages @SirCue_bot has no chat with her, and Telegram gives no way to open
-- one. The bot is the only road, so the bot carries the messages both ways.
--
-- Which means every message the bot puts in her chat has to remember which
-- conversation it belongs to, so that a reply can be routed back. Telegram's
-- reply carries the id of the message being replied to and nothing else, and a
-- conversation id hidden in the text would be a conversation id she can see
-- and delete.

create table telegram_relay (
  -- The message id in *her* chat: the handoff notification, or a relayed
  -- question. Telegram's ids are unique per chat and this table only ever holds
  -- one chat's, so it is the key.
  owner_message_id bigint primary key,
  conversation_id uuid not null references conversations (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index telegram_relay_conversation_id_idx on telegram_relay (conversation_id);

alter table telegram_relay enable row level security;

comment on table telegram_relay is
  'Maps a message in Shabnam''s Telegram chat to the conversation it is about, so that replying to it reaches the right person. Rows die with the conversation.';

-- ---------------------------------------------------------------------------
-- Who wrote it
--
-- Her replies are stored as `assistant`, because that is the side of the
-- conversation they are on and the history the model reads has to see them as
-- what was already said. But they are not the assistant's words, and a
-- transcript that shows them as Sir Cue's is a transcript that credits a
-- machine with what a person wrote.
--
-- A column rather than a new value on `message_role`: adding to an enum is a
-- migration that cannot be run inside a transaction safely, and every migration
-- here runs inside one.

alter table messages
  add column from_human boolean not null default false;

comment on column messages.from_human is
  'True when Shabnam wrote this herself, through the Telegram relay, rather than the model. Role stays `assistant` so the conversation history reads correctly.';

create index messages_from_human_idx on messages (conversation_id) where from_human;
