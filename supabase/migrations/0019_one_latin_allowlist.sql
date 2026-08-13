-- 0019 — one Latin allow-list, and it holds everything the content actually
-- says
--
-- Shabnam asked whether this list is the same everywhere. It was not.
--
-- The design is right and was right from 0012: the list lives in settings, is
-- injected into the Persian turn as a spelling rule, and the brand eval reads
-- the same row it is checking against — so the instruction and the check cannot
-- drift. The comment in converse.ts says exactly that, and says why: "the list
-- grows".
--
-- Then 0018 wrote the skill names and the course names into the Persian prompt
-- as literals, which is the one thing that design exists to prevent. That is
-- undone here: the prompt goes back to stating the rule, the row holds the
-- terms, and there is one place to edit again.
--
-- The row was also six entries against eighteen things the approved Persian
-- content genuinely uses. Run against a correct Persian answer, the brand check
-- rejected fifteen words — every course name, Google Meet, Academic, General —
-- none of which the bot invented. The twenty brand evals would have failed on
-- content Shabnam wrote and signed off.
--
-- Telegram, Email and LinkedIn are here because the bot already prints them:
-- they are the labels on `contact_channels`, they appear at the end of Persian
-- answers, and Shabnam confirmed they stay in English.
--
-- CEFR levels are deliberately absent. `latinInPersian` matches runs of letters
-- and discards runs of one, so "B1" reduces to "B" and is dropped before the
-- allow-list is consulted. Adding them would lengthen the list the model is
-- shown to no effect, and that list has been reproduced as content before.

update settings
set value = jsonb_build_array(
  'Skills for Band Score 7 and Above',
  'Skills for Band Score 6.5',
  'Grammar and Vocabulary',
  'Your goal speaks English.',
  'Business English',
  'Plan Tracker',
  'Google Meet',
  'AI & IELTS',
  'Listening',
  'Academic',
  'Telegram',
  'LinkedIn',
  'Speaking',
  'Reading',
  'Writing',
  'General',
  'Sir Cue',
  'Email'
)
where key = 'fa_latin_allowlist';

-- The Persian prompt keeps the formatting rule from 0018 and loses the list of
-- names, which now reaches the model from the row above, once per turn.

insert into prompt_versions (lang, version, is_active, note, content)
select
  'en',
  6,
  false,
  'No change; kept in step with fa.',
  content
from prompt_versions
where lang = 'en' and version = 5
  and not exists (select 1 from prompt_versions where lang = 'en' and version = 6);

insert into prompt_versions (lang, version, is_active, note, content)
select
  'fa',
  6,
  false,
  'Plain text, no Markdown. The allowed Latin terms come from settings, not from here.',
  content || E'\n\nچطور می‌نویسی\n\nمتنِ ساده بنویس. هیچ نشانه‌ی مارک‌داون به کار نبر: نه ستاره برای پررنگ کردن، نه\nبک‌تیک، نه علامت #. هرچه بنویسی عیناً همان‌طور نشان داده می‌شود، پس ** فقط دو تا\nستاره است و بس. بین پاراگراف‌ها یک خط خالی بگذار، و جایی که فهرست واقعاً کمک\nمی‌کند، هر بند را کوتاه و در یک خط بنویس.\n'
from prompt_versions
where lang = 'fa' and version = 4
  and not exists (select 1 from prompt_versions where lang = 'fa' and version = 6);

update prompt_versions set is_active = false where version < 6;
update prompt_versions set is_active = true where version = 6;
