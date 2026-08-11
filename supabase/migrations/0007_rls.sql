-- 0007 — row level security: deny by default, everywhere
--
-- There is no browser-side read path in this system. Every query runs inside a
-- Route Handler using the service role key, which bypasses RLS. So the correct
-- policy set for `anon` and `authenticated` is the empty one: RLS enabled, no
-- policies written, nothing readable.
--
-- That is deliberately stricter than it needs to be today. If a future feature
-- wants a browser to read one of these tables, the policy is added then, for
-- that table, with the access spelled out. The failure mode of this design is a
-- feature that does not work until someone writes a policy. The failure mode of
-- the opposite design is a lead list served to whoever asks for it.

alter table documents        enable row level security;
alter table chunks           enable row level security;
alter table unified_users    enable row level security;
alter table conversations    enable row level security;
alter table messages         enable row level security;
alter table leads            enable row level security;
alter table intake_log       enable row level security;
alter table feedback         enable row level security;
alter table unanswered       enable row level security;
alter table handoffs         enable row level security;
alter table settings         enable row level security;
alter table prompt_versions  enable row level security;
alter table channel_copy     enable row level security;
alter table model_config     enable row level security;
alter table pinned_models    enable row level security;
alter table embedding_config enable row level security;
alter table budget_config    enable row level security;
alter table admin_users      enable row level security;
alter table audit_log        enable row level security;

-- `force` so that even the table's owner is subject to RLS. Without it, a
-- connection that happens to authenticate as the owning role reads everything
-- while appearing to respect the policies above.
alter table documents        force row level security;
alter table chunks           force row level security;
alter table unified_users    force row level security;
alter table conversations    force row level security;
alter table messages         force row level security;
alter table leads            force row level security;
alter table intake_log       force row level security;
alter table feedback         force row level security;
alter table unanswered       force row level security;
alter table handoffs         force row level security;
alter table settings         force row level security;
alter table prompt_versions  force row level security;
alter table channel_copy     force row level security;
alter table model_config     force row level security;
alter table pinned_models    force row level security;
alter table embedding_config force row level security;
alter table budget_config    force row level security;
alter table admin_users      force row level security;
alter table audit_log        force row level security;

-- ---------------------------------------------------------------------------
-- Belt and braces: revoke the table grants too
--
-- RLS alone already returns zero rows to `anon`, but Supabase grants these
-- roles broad table privileges on `public` by default. Removing the grant means
-- an accidental future `create policy ... using (true)` still does not expose
-- the table, and it makes the intent legible in the schema itself.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

-- Applies to anything created later in this schema, so a table added in a
-- future migration is locked down before anyone remembers to think about it.
alter default privileges in schema public
  revoke all on tables from anon, authenticated;
alter default privileges in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges in schema public
  revoke all on functions from anon, authenticated;

-- Deliberately NOT revoking `usage on schema public` from these roles.
--
-- It would be one more layer, but Supabase's own PostgREST connects as
-- `authenticator` and then sets role to `anon` to introspect and serve; pulling
-- the schema grant out from under it produces failures inside managed
-- infrastructure that are hard to attribute to this migration. Forced RLS with
-- no policies, plus the revoked table grants above, already returns nothing to
-- these roles — the extra revoke buys defence in depth against a mistake nobody
-- has made yet, at the cost of a class of confusing breakage.

-- ---------------------------------------------------------------------------
-- Functions
--
-- `resize_embeddings` drops every embedding in the knowledge base. It is
-- reachable only through the service role, and the panel confirms before
-- calling it.
-- ---------------------------------------------------------------------------

revoke all on function match_chunks(extensions.vector, integer, double precision)
  from anon, authenticated;
revoke all on function resize_embeddings(integer) from anon, authenticated;
revoke all on function drop_embedding_index() from anon, authenticated;
revoke all on function create_embedding_index() from anon, authenticated;
