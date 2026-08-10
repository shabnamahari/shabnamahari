-- 0011 — welcome copy, and the waiting list for content that is not up yet
--
-- Two things this adds.
--
-- The welcome messages, which `channel_copy` was created for and never given.
-- They open by naming what the assistant can help with — the courses and
-- joining one — because the expensive misunderstanding is someone typing out a
-- paragraph of their own writing and only then being told this is not what it
-- does.
--
-- And a flag on `leads` for people who ask about material that has not been
-- published. Rather than a bare "I don't know", the bot can say more is coming
-- and offer to let them know. That is a lead, not a separate kind of record, so
-- it goes in the leads table — the same one the site's contact form will write
-- to later.

alter table leads
  add column notify_on_launch boolean not null default false;

comment on column leads.notify_on_launch is
  'Asked to be told when the course material is published. Set when someone leaves a name and contact after the bot said the content is not up yet.';

-- The panel's list of who is waiting.
create index leads_notify_on_launch_idx
  on leads (created_at desc)
  where notify_on_launch;

-- ---------------------------------------------------------------------------
-- Welcome copy
--
-- Written in each language rather than translated. The quick replies come from
-- the brand guide's approved lines; none of them is "How can I help you?",
-- which the build prompt rules out by name.
-- ---------------------------------------------------------------------------

insert into channel_copy (channel, lang, welcome, quick_replies) values
  (
    'web',
    'en',
    E'I''m Sir Cue, Shabnam''s assistant. I can answer questions about the courses and about joining one — what each course covers, how it runs, and where to begin.\n\nI am not Shabnam, so I do not check your English or mark your writing. That part is hers.',
    array[
      'How do the courses work?',
      'Which course fits me?',
      'How do I join?'
    ]
  ),
  (
    'web',
    'fa',
    E'من Sir Cue هستم، دستیارِ شبنم. می‌توانم به سؤال‌های شما درباره‌ی دوره‌ها و ثبت‌نام جواب بدهم — اینکه هر دوره شامل چه چیزی است، چطور پیش می‌رود، و از کجا شروع می‌شود.\n\nمن شبنم نیستم، پس انگلیسیِ شما را بررسی نمی‌کنم و نوشته‌تان را تصحیح نمی‌کنم. آن بخش کارِ خودِ اوست.',
    array[
      'دوره‌ها چطور کار می‌کنند؟',
      'کدام دوره به درد من می‌خورد؟',
      'چطور ثبت‌نام کنم؟'
    ]
  )
on conflict (channel, lang) do nothing;

-- ---------------------------------------------------------------------------
-- A setting for how much of the knowledge base is still to come
--
-- Kept as a switch rather than written into the prompt, so that the day the
-- material is published this stops being said everywhere without a prompt edit
-- and a new version.
-- ---------------------------------------------------------------------------

insert into settings (key, value, description) values
  (
    'content_coming_soon',
    'true'::jsonb,
    'While true, a question the knowledge base cannot answer is met with "more is coming" and an offer to be notified, rather than a bare "I do not know". Turn this off once the course material is published.'
  )
on conflict (key) do nothing;
