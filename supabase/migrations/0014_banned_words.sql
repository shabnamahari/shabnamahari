-- 0014 — the banned words become a setting, and "learner" comes off the list
--
-- Two changes, one of them Shabnam's decision and one of them structural.
--
-- The decision: `learner` and «زبان‌آموز» are allowed again. The brand guide
-- ruled them out on the grounds that "learner is what teachers call people, not
-- what people call themselves" (page 19, Decisions On Record, and page 18's
-- banned list). She has reconsidered and finds both `learner` and `student`
-- acceptable. The brand guide now disagrees with this row, and it is the
-- document that should be updated to match — not this one quietly reverted.
--
-- The structural change: the lists move out of the prompt text and into a
-- setting. Version 1 of each prompt spelled them out inline, which meant
-- changing one word required a new prompt version in each language, and meant
-- the phase 3 eval suite would have carried a second copy of the list that
-- could drift out of step with the first. A test that disagrees with the
-- instruction it is testing is worse than no test — the same reason the Latin
-- allowlist lives in `settings`.

insert into settings (key, value, description) values
  (
    'banned_words',
    '{
      "en": [
        "guaranteed", "amazing", "easy", "instantly", "world-class",
        "dream", "revolutionary", "best", "fully personalized", "journey",
        "strategy"
      ],
      "fa": [
        "تضمینی", "شگفت‌انگیز", "آسان", "فوری", "در سطح جهانی",
        "رؤیا", "انقلابی", "بهترین", "کاملاً شخصی‌سازی‌شده", "سفر",
        "استراتژی"
      ]
    }'::jsonb,
    'Words the bot never writes, per language. Injected into every turn and read by the eval suite, so the check and the instruction can never drift apart. `learner` and «زبان‌آموز» were removed on 10 August 2026 at Shabnam''s request; the brand guide still lists them and needs updating to match.'
  )
on conflict (key) do update
  set value = excluded.value,
      description = excluded.description,
      updated_at = now();

-- ---------------------------------------------------------------------------
-- Prompt version 2: the same rules, without the inline word lists
-- ---------------------------------------------------------------------------

insert into prompt_versions (lang, version, is_active, note, content)
select
  'en',
  2,
  false,
  'Banned words moved to settings.banned_words; learner removed.',
  replace(
    content,
    E'WORDS YOU NEVER USE\n\nguaranteed, amazing, easy, instantly, world-class, dream, revolutionary, best,\nfully personalized, journey, learner, strategy. Where you would write\n"strategy", write "path".\n\n',
    E'WORDS YOU NEVER USE\n\nA list of banned words is given to you with each question. Never write any of\nthem. Where you would write "strategy", write "path".\n\n'
  )
from prompt_versions
where lang = 'en' and version = 1
  and not exists (select 1 from prompt_versions where lang = 'en' and version = 2);

insert into prompt_versions (lang, version, is_active, note, content)
select
  'fa',
  2,
  false,
  'Banned words moved to settings.banned_words; زبان‌آموز removed.',
  replace(
    content,
    E'کلماتی که هرگز نمی‌نویسی\n\nتضمینی · شگفت‌انگیز · آسان · فوری · در سطح جهانی · رؤیا · انقلابی · بهترین ·\nکاملاً شخصی‌سازی‌شده · سفر · زبان‌آموز · استراتژی. به‌جای «استراتژی» بنویس\n«مسیر».\n\n',
    E'کلماتی که هرگز نمی‌نویسی\n\nهمراه هر سؤال، فهرستی از کلمات ممنوع به تو داده می‌شود. هیچ‌کدامشان را ننویس.\nبه‌جای «استراتژی» بنویس «مسیر».\n\n'
  )
from prompt_versions
where lang = 'fa' and version = 1
  and not exists (select 1 from prompt_versions where lang = 'fa' and version = 2);

-- Activated in a second step so the partial index that permits one active
-- prompt per language never sees two at once.
update prompt_versions set is_active = false where version = 1;
update prompt_versions set is_active = true where version = 2;
