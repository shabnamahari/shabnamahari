-- 0032 — enrolments: which courses an account is actually on
--
-- The account page has a panel headed "My courses" and until now there was
-- nothing that could fill it. The catalogue itself is not in this database and
-- is not being moved here: the Programs and their entries are written in
-- `lib/projects.ts`, they are part of the site's design as much as its content,
-- and a copy of them in a table would be a second catalogue to keep in step.
--
-- What is missing is the join — the fact that this person is on that course —
-- and that is what this table is. A row names a course by the same two segments
-- its URL carries, so `('ielts', 'band-7-plus')` is /learn/ielts/band-7-plus.
-- Nothing enforces that those segments exist, because the thing they would have
-- to point at is a TypeScript array; `lib/account/enrolments.ts` resolves them
-- against it when the page renders and drops what it cannot resolve, so a
-- renamed program costs a missing line rather than a link into a 404.
--
-- Empty on purpose. Shabnam enters the enrolments she has; nobody's page will
-- claim a course until she does.

create table enrolments (
  id uuid primary key default extensions.gen_random_uuid(),

  -- Gone when the account is. An enrolment is a fact about a person, and there
  -- is no person left to hold it.
  account_id uuid not null references accounts (id) on delete cascade,

  -- The program's slug: 'ielts', 'blogcasts', 'business-english'.
  program text not null,

  -- The entry inside it, or null for the whole program. Null is not "unknown"
  -- here — it is the honest shape of someone who is on Ielts generally rather
  -- than on one of its six Programs.
  entry text,

  enrolled_at timestamptz not null default now()
);

-- One row per person per course. `coalesce` because a null entry is a value in
-- this table and two of them are the same enrolment twice, which a plain unique
-- index over a nullable column would happily allow.
create unique index enrolments_one_per_course
  on enrolments (account_id, program, coalesce(entry, ''));

-- The page's only query: this account's rows, newest first.
create index enrolments_account_idx on enrolments (account_id, enrolled_at desc);

comment on table enrolments is
  'Which courses an account is on. The courses themselves live in lib/projects.ts; a row here is the join, keyed by the same slugs the URLs use.';

-- 0007's rule, and it applies to a table that names what a person has bought as
-- much as to any other: RLS on, no policies, nothing readable except through
-- the service role on the server. `force` so the owning role is subject to it
-- too.
alter table enrolments enable row level security;
alter table enrolments force row level security;
