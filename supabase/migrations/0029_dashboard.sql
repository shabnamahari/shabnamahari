-- 0029 — the dashboard's numbers, counted in the database
--
-- One function rather than a page full of queries, and aggregates in SQL rather
-- than rows pulled into JavaScript to be added up. Today the difference is
-- nothing — the tables are empty. It stops being nothing the first busy month,
-- and a dashboard that gets slower exactly when the numbers become interesting
-- is a dashboard nobody opens.
--
-- The window is given in days rather than as a timestamp, and the boundary is
-- worked out here. Two reasons, and the second is the real one: a page that
-- computes `Date.now()` while rendering is reading a clock during render, which
-- React's own lint rule refuses — and it would be the web server's clock
-- deciding which rows the database returns, when the database has a clock of
-- its own and owns the rows.
--
-- Null means all of it.

create or replace function dashboard(p_days integer default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with
  convo as (
    select * from conversations
    where p_days is null
       or started_at >= now() - make_interval(days => p_days)
  ),
  msg as (
    select m.* from messages m
    join convo c on c.id = m.conversation_id
  ),
  answers as (
    select * from msg where role = 'assistant'
  )
select jsonb_build_object(
  -- The three counts everything else is a fraction of.
  'conversations', (select count(*) from convo),
  'people',        (select count(distinct coalesce(external_user_id, id::text)) from convo),
  'messages',      (select count(*) from msg),

  -- Channel and language side by side, which section 10 asks for in bold: the
  -- brand is bilingual by architecture, so "how many conversations" without
  -- "in which language" is the number that hides the decision.
  'split', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'channel', channel, 'lang', lang, 'conversations', n
    ) order by n desc), '[]'::jsonb)
    from (select channel, lang, count(*) as n from convo group by channel, lang) s
  ),

  -- What the funnel actually does: how many were given the assessment link,
  -- and how many left something to be reached on.
  'placement_sent', (select count(*) from convo where placement_link_sent_at is not null),
  'leads',          (select count(*) from leads l join convo c on c.id = l.conversation_id),
  'reachable',      (select count(*) from leads l join convo c on c.id = l.conversation_id
                     where l.contact is not null),

  -- Length and duration. Median as well as mean, because one person who left a
  -- tab open for six hours moves an average and tells you nothing.
  'avg_messages', (select round(avg(n), 1) from (
      select count(*) as n from msg group by conversation_id) t),
  'median_seconds', (select percentile_cont(0.5) within group (
      order by extract(epoch from (last_message_at - started_at))) from convo),

  -- Answers somebody said were wrong. Not a satisfaction rate: there is no
  -- thumbs-up to count, by design — the panel acts on the bad ones.
  'answers',      (select count(*) from answers),
  'marked_wrong', (select count(*) from feedback f join answers a on a.id = f.message_id
                   where f.rating = -1),

  -- What the answers were drawn from, which is the honest version of "frequent
  -- topics": not what people asked, but which part of the knowledge base kept
  -- being needed. Same signal, without pretending to have clustered anything.
  'drawn_from', (
    select coalesce(jsonb_agg(jsonb_build_object('title', title, 'times', n)
                              order by n desc), '[]'::jsonb)
    from (
      select d.title, count(*) as n
      from answers a
      cross join lateral unnest(a.retrieved_chunk_ids) as chunk_id
      join chunks ch on ch.id = chunk_id
      join documents d on d.id = ch.document_id
      group by d.title
      order by n desc
      limit 8
    ) t
  ),

  -- Spend, by model. `cost` has been recorded per message since phase 1.
  'by_model', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'model', model_used, 'messages', n, 'tokens_in', ti,
      'tokens_out', tout, 'cost', cost
    ) order by cost desc), '[]'::jsonb)
    from (
      select model_used,
             count(*) as n,
             coalesce(sum(tokens_in), 0) as ti,
             coalesce(sum(tokens_out), 0) as tout,
             coalesce(sum(cost), 0) as cost
      from answers
      where model_used is not null
      group by model_used
    ) t
  ),

  -- Questions nothing answered, which is the one number that is a to-do list.
  'unanswered', (select count(*) from unanswered u join convo c on c.id = u.conversation_id)
);
$$;

comment on function dashboard is
  'Every figure the dashboard shows, for conversations started in the last p_days days (null for all time). One round trip, aggregated in the database.';

-- Closed the same way as everything else this schema owns. 0028 revoked the
-- default grant on every security-definer function that existed then; a new one
-- arrives with the same default and needs the same treatment, which is the part
-- that is easy to forget and the reason 0028 says so out loud.
revoke execute on function dashboard(integer) from public, anon, authenticated;
grant execute on function dashboard(integer) to service_role;
