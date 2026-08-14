-- 0028 — the two functions 0027 added were callable by anyone
--
-- Postgres grants EXECUTE on a new function to PUBLIC by default, and both of
-- 0027's are `security definer`, so they run with the owner's rights no matter
-- who calls them. The table underneath is closed — reading `rate_limit` with
-- the anon key returns 401, as RLS intends — but the functions in front of it
-- were not, and a function is a door in its own right.
--
-- Tested rather than reasoned about. With the anon key:
--
--   month_spend_usd    200  0
--   check_rate_limit   200  true
--   rate_limit table   401  insufficient privilege
--
-- The first leaks what the month has cost. The second is worse: it increments
-- the counter for any bucket it is handed, so anyone could exhaust the
-- allowance for a chosen address or person and lock real visitors out of the
-- assistant. A rate limiter that a stranger can spend on somebody else's behalf
-- is a denial of service wearing the costume of a defence.
--
-- Nothing legitimate is lost. Both are only ever called by the server, through
-- the service role, which is not affected by these grants.

revoke execute on function check_rate_limit(text, integer, integer)
  from public, anon, authenticated;

revoke execute on function month_spend_usd()
  from public, anon, authenticated;

grant execute on function check_rate_limit(text, integer, integer) to service_role;
grant execute on function month_spend_usd() to service_role;

-- The same default applies to `search_chunks`, added in 0002 and never
-- revoked. It takes an embedding and returns knowledge-base text — all of
-- which is published on the site anyway, so this is tidiness rather than a
-- leak, but the rule is easier to keep than the exceptions are to remember:
-- a function this schema owns is reachable only by the server.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.oid::regprocedure::text not like 'check_rate_limit%'
      and p.oid::regprocedure::text not like 'month_spend_usd%'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn.signature);
    execute format('grant execute on function %s to service_role', fn.signature);
  end loop;
end;
$$;
