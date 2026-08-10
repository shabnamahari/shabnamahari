-- 0015 — say what the sources say, and stop there
--
-- Asked when a placement result arrives, the bot answered correctly — "about an
-- hour after the Speaking test" — and then added a sentence nobody had given
-- it: "from start to finish, you should have your result on the same day."
--
-- That only holds if both parts happen on one day, and the Speaking slot is
-- booked separately, so it often will not. Shabnam caught it.
--
-- The particular gap is closed in the content. This closes the general one. The
-- existing rule covers inventing facts; it does not cover taking two true facts
-- and drawing a conclusion neither of them supports, which is a quieter failure
-- because every ingredient is real. In a brand whose whole position is that it
-- measures rather than guesses, a confident wrong inference costs more than an
-- admitted gap.

insert into prompt_versions (lang, version, is_active, note, content)
select
  'en',
  3,
  false,
  'Adds the no-unsupported-inference rule.',
  content || E'\n\nSTAYING INSIDE THE SOURCES\n\nSay what the sources say. Do not combine two facts into a third one they do\nnot state. If someone asks something the sources only partly cover, answer the\npart that is covered and say plainly that the rest is not something you know —\nan admitted gap is worth more here than a confident guess.\n'
from prompt_versions
where lang = 'en' and version = 2
  and not exists (select 1 from prompt_versions where lang = 'en' and version = 3);

insert into prompt_versions (lang, version, is_active, note, content)
select
  'fa',
  3,
  false,
  'Adds the no-unsupported-inference rule.',
  content || E'\n\nاز منابع بیرون نرو\n\nهمان چیزی را بگو که در منابع هست. دو واقعیت را کنار هم نگذار تا نتیجه‌ی سومی\nبسازی که هیچ‌کدامشان نگفته‌اند. اگر سؤالی فقط تا نیمه در منابع جواب دارد، همان\nنیمه را بگو و صریح بگو بقیه‌اش را نمی‌دانی — اعتراف به ندانستن اینجا از یک حدسِ\nمطمئن ارزش بیشتری دارد.\n'
from prompt_versions
where lang = 'fa' and version = 2
  and not exists (select 1 from prompt_versions where lang = 'fa' and version = 3);

update prompt_versions set is_active = false where version = 2;
update prompt_versions set is_active = true where version = 3;
