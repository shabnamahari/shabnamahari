-- 0027 — a limit on the door, and a cap on the bill
--
-- Both public endpoints spend money on every call: an embedding, then a
-- generation. Neither has ever been throttled, and `budget_config.monthly_cap_usd`
-- has been set to 50 since phase 1 and read as a cap exactly never — `converse`
-- takes only `over_cap_model` from that row, so the fallback existed with
-- nothing to trigger it.
--
-- That was survivable while the account had no credit, because the ceiling was
-- somebody else's free quota. It stops being survivable the moment the account
-- is topped up: the endpoint is one POST, it is public, and there is nothing
-- between a script and Shabnam's balance. This lands with the credit, not after.

-- ---------------------------------------------------------------------------
-- Counting requests
--
-- In the database rather than in memory, because there is no one process to
-- hold a counter: every request may be served by a different instance, and a
-- per-instance limit is no limit at all.

create table rate_limit (
  -- What is being limited: "web:<cookie>", "ip:<address>", "tg:<chat id>".
  bucket text not null,
  -- The start of the window this count belongs to, truncated to the window
  -- size. Rows are therefore self-expiring: a new window is a new row and the
  -- old one is never read again.
  window_start timestamptz not null,
  count integer not null default 0,

  primary key (bucket, window_start)
);

create index rate_limit_window_start_idx on rate_limit (window_start);

comment on table rate_limit is
  'Request counts per identity per window. Rows older than a day are dead weight and can be deleted at any time; nothing reads them.';

alter table rate_limit enable row level security;

-- ---------------------------------------------------------------------------
-- One atomic ask
--
-- Read-then-write in the application would let two simultaneous requests both
-- see the count under the limit and both proceed. `insert ... on conflict do
-- update` is a single statement, so the increment and the decision happen
-- under one lock.
--
-- Returns true when the request may proceed.

create or replace function check_rate_limit(
  p_bucket text,
  p_window_seconds integer,
  p_limit integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  -- Floor the clock to the window, so every caller in the same period agrees on
  -- which row they are counting into.
  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into rate_limit (bucket, window_start, count)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start)
    do update set count = rate_limit.count + 1
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

comment on function check_rate_limit is
  'Increments the counter for this bucket and window and returns whether the request is within the limit. One statement, so concurrent requests cannot both pass on the same allowance.';

-- ---------------------------------------------------------------------------
-- What the month has cost
--
-- Summed from `messages.cost`, which has been recorded per message since phase
-- 1 — the number needed to enforce the cap was already being collected and
-- never added up.

create or replace function month_spend_usd() returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(cost), 0)
  from messages
  where created_at >= date_trunc('month', now());
$$;

comment on function month_spend_usd is
  'Total cost of every message this calendar month. The cap is compared against this.';
