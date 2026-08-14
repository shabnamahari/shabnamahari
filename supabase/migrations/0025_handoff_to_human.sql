-- 0025 — the bot can ask for Shabnam
--
-- The `handoffs` table has existed since 0004 and nothing has ever written a
-- row to it, because the tool the spec names was never built. So the queue was
-- not an unbuilt screen — it was an unreachable state. Someone asking to speak
-- to a person got the contact details appended to an answer and that was all;
-- Shabnam never learned they had asked.
--
-- Two things go in here: where to send the notification, and the instruction
-- that tells the model the tool exists at all. 0017 is the precedent for the
-- second — `capture_lead` worked perfectly and went uncalled for days, because
-- a small model does not infer a tool's existence from a clause buried in a
-- turn directive. It has to be named, with the moment to use it.

insert into settings (key, value, description) values
  (
    'owner_telegram_chat_id',
    '"109578313"'::jsonb,
    'Where handoff notifications go. Shabnam''s own Telegram, not the bot''s — read from the one telegram user the bot had seen after she messaged @SirCue_bot. Kept here rather than in an env var so it can be corrected without a deploy.'
  )
on conflict (key) do update
  set value = excluded.value,
      description = excluded.description,
      updated_at = now();

-- ---------------------------------------------------------------------------
-- The instruction, in both languages.
--
-- The bar is deliberately high. A bot that fetches a human whenever it is
-- unsure is a bot that fetches a human all day, and this is a one-person brand
-- — every handoff costs Shabnam an interruption. So: only when asked, or when
-- the thing being asked about is genuinely hers to answer.
--
-- And it must not promise a time. She may be teaching. "She will see this" is
-- true; "she will reply shortly" is a commitment the bot cannot keep, and 0017
-- settled that the claim and the act are one thing.

insert into prompt_versions (lang, version, is_active, note, content)
select
  'en',
  (select coalesce(max(version), 0) + 1 from prompt_versions where lang = 'en'),
  false,
  'Names handoff_to_human and when to use it.',
  content || E'\n\nWHEN SOMEONE WANTS SHABNAM HERSELF\n\nYou have a tool called handoff_to_human. Call it when someone asks to speak to\nShabnam or to a person, or when what they are asking is hers to answer rather\nthan yours — a decision about their own plan, a price, anything about their\nparticular situation that the sources do not settle.\n\nDo not call it merely because you are unsure. Not knowing something is what\n"I do not know" is for, and every handoff costs her an interruption.\n\nAfter calling it, say that she has been told and that she will see it. Never say\nwhen she will reply. You do not know, and a time you invent is a promise she has\nto keep.\n'
from prompt_versions
where lang = 'en' and is_active and content not like '%handoff_to_human%';

insert into prompt_versions (lang, version, is_active, note, content)
select
  'fa',
  (select coalesce(max(version), 0) + 1 from prompt_versions where lang = 'fa'),
  false,
  'Names handoff_to_human and when to use it.',
  content || E'\n\nوقتی کسی خودِ شبنم را می‌خواهد\n\nابزاری داری به اسم handoff_to_human. وقتی کسی می‌گوید می‌خواهد با شبنم یا با یک\nآدم صحبت کند صدایش بزن، یا وقتی چیزی که پرسیده جوابش دستِ ایشان است نه تو —\nتصمیم درباره‌ی برنامه‌ی خودش، قیمت، یا هر چیزی که مخصوصِ شرایط اوست و منابع\nتکلیفش را روشن نمی‌کنند.\n\nفقط به این دلیل که مطمئن نیستی صدایش نزن. ندانستن همان چیزی است که «نمی‌دانم»\nبرایش هست، و هر ارجاع یک وقفه در کارِ ایشان است.\n\nبعد از صدا زدنش بگو که خبر به ایشان رسید و می‌بینندش. هرگز نگو کِی جواب می‌دهند.\nنمی‌دانی، و زمانی که از خودت بسازی، قولی است که ایشان باید به آن عمل کند.\n'
from prompt_versions
where lang = 'fa' and is_active and content not like '%handoff_to_human%';

-- Deactivate before activate, per language: the partial unique index allows one
-- active prompt each, and the other order collides after having already turned
-- the running prompt off.
update prompt_versions set is_active = false where is_active;

update prompt_versions p
set is_active = true
where version = (
  select max(version) from prompt_versions q where q.lang = p.lang
);
