-- 0001 — extensions and shared types
--
-- Everything the chatbot stores lives in `public`. The vector extension goes in
-- `extensions` instead, which is where Supabase keeps them and what its own
-- search_path already covers; installing pgvector into `public` works but then
-- every dump of the schema carries the extension's objects with it.

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "vector" with schema extensions;

-- ---------------------------------------------------------------------------
-- Shared enums
--
-- Written as enums rather than free text because each of these is read by the
-- brain to make a decision, and a typo in a channel name would silently route a
-- conversation nowhere. Adding a value later is `alter type ... add value`,
-- which does not rewrite the table.
-- ---------------------------------------------------------------------------

-- The two languages the bot speaks. Not a general-purpose locale column: the
-- brand guide commits to exactly these two, and a third would change the
-- retrieval strategy rather than just adding a row.
create type lang as enum ('en', 'fa');

create type channel as enum ('web', 'widget', 'telegram');

create type message_role as enum ('user', 'assistant', 'system', 'tool');

create type document_source_type as enum ('url', 'pdf', 'docx', 'text');

-- `pending` → `processing` → `ready`, or `failed` with `error` set. A document
-- that is not `ready` is invisible to retrieval, so a half-chunked upload can
-- never leak into an answer.
create type document_status as enum ('pending', 'processing', 'ready', 'failed');

create type conversation_status as enum ('open', 'needs_human', 'human_active', 'closed');

-- Where a lead sits in the one funnel this brand has. `placement_taken` is the
-- step the product actually cares about — the brand guide's ladder puts the
-- assessment before everything else.
create type lead_status as enum ('new', 'contacted', 'placement_taken', 'enrolled', 'lost');

-- Deliberately three-valued rather than a boolean. "I don't know yet" is the
-- most common real answer, and a boolean would force the bot to guess — which
-- is the one thing section 02 forbids it to do about a person's level.
create type placement_status as enum ('unknown', 'not_taken', 'taken');

create type admin_role as enum ('owner', 'read_only');

create type embedding_provider as enum ('cohere', 'openai', 'google', 'voyage');
