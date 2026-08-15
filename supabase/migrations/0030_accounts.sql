-- 0030 — accounts: the people who sign up, and the codes that prove their email
--
-- The first identity on this site that belongs to a visitor rather than to
-- Shabnam. `admin_users` is her; `unified_users` is a person the bot has met,
-- keyed by whatever id a channel happens to know them by and carrying no proof
-- that they are anyone in particular. This is the third thing: someone who has
-- shown they can read a named mailbox, or who has been vouched for by Google.
--
-- It is deliberately not merged into `unified_users`. That table's key is
-- (channel, external_id) — an anonymous cookie, a Telegram chat id — and its
-- rows are made without anyone being asked. Putting a verified identity in the
-- same table would mean a row that sometimes proves something and usually does
-- not, and every later reader would have to know which kind it was holding.
-- Linking the two is a good idea and is left for when there is a reason: the
-- column to add is `unified_users.account_id`, not a merge.

create table accounts (
  id uuid primary key default extensions.gen_random_uuid(),

  -- Stored as typed, compared lowercased. Someone who signs up as Shabnam@…
  -- and comes back as shabnam@… is the same person, and the unique index below
  -- is what actually enforces that; keeping the original casing is only so the
  -- address can be shown back to them the way they wrote it.
  email text not null,

  -- From the form on the way in, or from Google. Nullable because Google is
  -- allowed to decline to tell us and the sign-up form is allowed to be filled
  -- in without it.
  name text,

  -- Google's `sub`: stable for the life of the account and, unlike the address,
  -- never reassigned. Matching on email alone would mean anyone who could get a
  -- Google account at a recycled address could take over the account here.
  google_sub text,

  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- One account per address, whatever case it was typed in.
create unique index accounts_email_key on accounts (lower(email));

-- Partial, because most accounts have never touched Google and null is not a
-- value that should collide with another null.
create unique index accounts_google_sub_key
  on accounts (google_sub)
  where google_sub is not null;

comment on table accounts is
  'People who have signed up to the site. Identity only: what they can do with it lives elsewhere.';

alter table accounts enable row level security;

-- ---------------------------------------------------------------------------
-- The codes
--
-- Hashed, not stored. A six-digit code is a password with a very short life,
-- and the reason to hash a password is that the database may be read by someone
-- who should not have it — which is no less true for being true only for ten
-- minutes. The same scrypt format the admin password uses, so there is one way
-- to hash a secret in this codebase rather than two.
--
-- `attempts` is the other half of that. Six digits is a million guesses, which
-- is nothing to a script; the code is worthless without a low ceiling on how
-- many times it may be tried. Sending is limited separately, by
-- `check_rate_limit`, so a mailbox cannot be used as somebody's outbox.

create table email_codes (
  id uuid primary key default extensions.gen_random_uuid(),
  email text not null,
  code_hash text not null,

  -- Carried from the sign-up form through the round trip, so a brand new
  -- account keeps the name its owner typed. Held here rather than trusted from
  -- the verifying request: that request arrives from a browser and could say
  -- anything, and by then the address has been proven but the name has not been
  -- looked at since.
  name text,

  expires_at timestamptz not null,
  attempts integer not null default 0,
  -- Set the moment a code is spent, so it cannot be replayed even inside its
  -- own lifetime.
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index email_codes_email_idx on email_codes (lower(email), created_at desc);

comment on table email_codes is
  'Outstanding sign-in codes, hashed. Rows past their expiry are dead weight and may be deleted at any time; nothing reads them.';

alter table email_codes enable row level security;
