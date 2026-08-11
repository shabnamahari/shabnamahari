-- 0004 — what the bot collects: leads, intake, feedback, gaps
--
-- The point of every conversation is three facts: target band, exam date, and
-- whether the person has taken the placement assessment. The bot gathers them
-- and hands them over; it does not draw conclusions from them.

create table leads (
  id uuid primary key default extensions.gen_random_uuid(),
  name text,
  -- Free text on purpose. People give an email, a phone number, a Telegram
  -- handle, or an Instagram name — normalising that into typed columns would
  -- reject the contact detail someone actually wants to be reached on.
  contact text,
  -- The number they need, e.g. 6.5 or 7. Half-band steps, hence numeric.
  target_band numeric(2, 1),
  exam_date date,
  -- Whether they have sat IELTS before. Nullable because "not asked yet" is
  -- distinct from "no" — and because copy that assumes a previous score
  -- excludes the primary persona (brand guide, ban two).
  taken_before boolean,
  placement_status placement_status not null default 'unknown',
  -- Mirrors conversations.placement_link_sent_at, kept on the lead so follow-up
  -- can see whether the link was ever actually sent to this person.
  placement_link_sent_at timestamptz,
  source channel not null,
  conversation_id uuid references conversations (id) on delete set null,
  status lead_status not null default 'new',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_conversation_id_idx on leads (conversation_id);
create index leads_status_idx on leads (status);
create index leads_created_at_idx on leads (created_at desc);
-- The two dates worth sorting by in the panel: who is closest to their exam.
create index leads_exam_date_idx on leads (exam_date) where exam_date is not null;

-- One lead per conversation. Without this, a second `capture_lead` call in the
-- same conversation creates a duplicate rather than filling in the field that
-- was missing the first time.
create unique index leads_conversation_id_key
  on leads (conversation_id)
  where conversation_id is not null;

-- ---------------------------------------------------------------------------
-- Persona validation
--
-- Three questions, asked naturally and spread across a conversation, feeding
-- the buyer-persona review dated 28 October 2026. The bot is the highest-volume
-- point of contact, so it is where the real numbers will come from.

create table intake_log (
  id uuid primary key default extensions.gen_random_uuid(),
  conversation_id uuid references conversations (id) on delete set null,
  found_via text,
  goal text,
  occupation text,
  created_at timestamptz not null default now()
);

create unique index intake_log_conversation_id_key
  on intake_log (conversation_id)
  where conversation_id is not null;

-- ---------------------------------------------------------------------------

create table feedback (
  id uuid primary key default extensions.gen_random_uuid(),
  message_id uuid not null references messages (id) on delete cascade,
  -- -1 or 1. A two-value scale rather than five stars: the panel acts on the
  -- thumbs-down list, and nothing would be done differently with a 3 vs a 4.
  rating smallint not null check (rating in (-1, 1)),
  comment text,
  created_at timestamptz not null default now(),

  unique (message_id)
);

create index feedback_rating_idx on feedback (rating);

-- ---------------------------------------------------------------------------
-- Questions the bot could not answer
--
-- With a knowledge base this small the bot will reach "I don't know" often, and
-- this table plus the loop back into `documents` is a first-class feature, not a
-- diagnostic. Each unresolved row is a gap in the site's own content.

create table unanswered (
  id uuid primary key default extensions.gen_random_uuid(),
  question text not null,
  lang lang not null,
  conversation_id uuid references conversations (id) on delete set null,
  -- Best similarity actually achieved, so the panel can separate "nothing close
  -- exists" from "it was just under the threshold" — the second is a tuning
  -- problem, the first is a content problem.
  best_similarity double precision,
  resolved boolean not null default false,
  -- Set when the gap is closed by adding content, linking the fix to the gap.
  resolved_document_id uuid references documents (id) on delete set null,
  created_at timestamptz not null default now()
);

create index unanswered_resolved_idx on unanswered (resolved, created_at desc);
create index unanswered_lang_idx on unanswered (lang);

-- ---------------------------------------------------------------------------
-- Human handoff queue
--
-- A one-person brand has no operator pool. Handoff means the conversation is
-- flagged, Shabnam gets a Telegram notification, and she can take over live and
-- hand back.

create table handoffs (
  id uuid primary key default extensions.gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  reason text,
  notified_at timestamptz,
  -- When Shabnam entered the conversation, and when the bot resumed. Both null
  -- means the handoff is still waiting in the queue.
  claimed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now()
);

create index handoffs_conversation_id_idx on handoffs (conversation_id);
create index handoffs_pending_idx on handoffs (created_at desc) where claimed_at is null;
