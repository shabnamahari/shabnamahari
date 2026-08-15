-- 0031 — the index 0030 should have had, and an atomic guess
--
-- Both found reviewing 0030's routes rather than in use.

-- ---------------------------------------------------------------------------
-- The index
--
-- 0030 indexed `(lower(email), created_at desc)` on the reasoning that lookups
-- would be case-insensitive. They are not: both the route that writes a code
-- and the route that spends one lowercase the address first, so the predicate
-- is a plain `email = '…'` — which an index on `lower(email)` cannot serve. The
-- result was a sequential scan on every sign-in, over a table nothing prunes.

drop index if exists email_codes_email_idx;

create index email_codes_email_idx on email_codes (email, created_at desc);

-- ---------------------------------------------------------------------------
-- One guess, claimed atomically
--
-- `attempts` was read, compared against the ceiling, and written back by the
-- application. Fifty simultaneous requests all read 0, all pass the check, and
-- all fifty guess — the limit is enforced against one caller at a time and
-- against nobody at all in parallel, which is the only way anyone would ever
-- attack it.
--
-- So the guess is claimed rather than counted afterwards: a single UPDATE picks
-- the newest live code, increments it, and hands back the row. Under one lock,
-- so the fifty-first caller gets nothing. The hash is compared afterwards in
-- the application, which is right — the comparison is slow by design and has no
-- business inside a statement holding a row lock.
--
-- Newest first, because asking again supersedes: someone who pressed "send
-- code" twice is holding the second email.

create or replace function claim_code_attempt(
  p_email text,
  p_max_attempts integer
) returns table (id uuid, code_hash text, name text)
language sql
security definer
set search_path = public
as $$
  update email_codes
  set attempts = attempts + 1
  where email_codes.id = (
    select c.id
    from email_codes c
    where c.email = p_email
      and c.consumed_at is null
      and c.expires_at > now()
      and c.attempts < p_max_attempts
    order by c.created_at desc
    limit 1
  )
  returning email_codes.id, email_codes.code_hash, email_codes.name;
$$;

comment on function claim_code_attempt is
  'Takes one guess against the newest live code for an address: increments the counter and returns the row, or returns nothing when there is no code left to guess at. Atomic, so a burst of parallel guesses cannot all pass the ceiling.';

-- ---------------------------------------------------------------------------
-- Spending it, once
--
-- Same shape of race one step later. Two requests holding the same correct code
-- would both find `consumed_at` null and both be handed a session. The guard is
-- in the WHERE clause, so exactly one UPDATE matches and the loser is told no.

create or replace function consume_code(p_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  with spent as (
    update email_codes
    set consumed_at = now()
    where id = p_id and consumed_at is null
    returning 1
  )
  select exists (select 1 from spent);
$$;

comment on function consume_code is
  'Marks a code spent and says whether this caller was the one who spent it. False means somebody else got there first.';

-- Closed the same way as everything else this schema owns — 0028's rule: a new
-- security-definer function arrives with the default grant and needs it revoked,
-- which is the part that is easy to forget.
revoke execute on function claim_code_attempt(text, integer) from public, anon, authenticated;
grant execute on function claim_code_attempt(text, integer) to service_role;

revoke execute on function consume_code(uuid) from public, anon, authenticated;
grant execute on function consume_code(uuid) to service_role;
