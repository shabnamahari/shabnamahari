-- 0021 — somewhere to keep the owner's password
--
-- 0006 built the accounts table and the audit log and left out the credential,
-- because the sign-in method had not been chosen. It is chosen now: one owner,
-- a password, and a signed session cookie.
--
-- Not a magic link, which needs somewhere to send mail from and there is no
-- SMTP here. Not an OAuth provider, which would put the panel's front door
-- inside somebody else's account. One person needs to get in.
--
-- The column holds `scrypt$<salt>$<hash>` — the scheme names itself, so a
-- future change of algorithm can be told apart from this one instead of
-- guessed at. Null means the account exists but cannot sign in yet, which is
-- what an invited account looks like before it is claimed.

alter table admin_users add column if not exists password_hash text;

comment on column admin_users.password_hash is
  'scrypt$<salt hex>$<hash hex>. Null until the account has a password set.';
