-- 0006 — panel accounts and the audit trail
--
-- Two roles are enough today: owner and read_only. The structure has to admit
-- `content_editor` and `operator` later without a migration, which is why the
-- role is an enum on a row rather than a set of boolean columns — adding a
-- value to an enum does not rewrite the table.

create table admin_users (
  id uuid primary key default extensions.gen_random_uuid(),
  email text not null,
  role admin_role not null default 'read_only',
  -- Null until the account is first used, so the panel can show which invited
  -- accounts have never signed in.
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

-- Case-insensitive: nobody should be able to create a second account by
-- capitalising their own address differently.
create unique index admin_users_email_key on admin_users (lower(email));

-- ---------------------------------------------------------------------------
-- Audit log
--
-- Every write from the panel lands here. `actor_email` is denormalised so the
-- trail survives the account being deleted — an audit log that loses its author
-- when someone is removed is not an audit log.

create table audit_log (
  id uuid primary key default extensions.gen_random_uuid(),
  admin_user_id uuid references admin_users (id) on delete set null,
  actor_email text,
  -- e.g. 'model_config.update', 'documents.delete', 'prompt_versions.activate'
  action text not null,
  -- What it acted on: table plus id, or a settings key.
  target text,
  -- Before/after where it is worth keeping. Secrets are never written here.
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_created_at_idx on audit_log (created_at desc);
create index audit_log_admin_user_id_idx on audit_log (admin_user_id);
create index audit_log_action_idx on audit_log (action);
