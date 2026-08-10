-- 0017 — do not say you saved it unless you saved it
--
-- Asked to be notified, the bot replied «من اطلاعات تو را ثبت کردم» — I have
-- recorded your details — and recorded nothing. No tool call, no lead row, and
-- a person who now believes they are on a list they are not on.
--
-- The tool works. Given a short prompt that names it, both configured models
-- call it correctly with the right arguments. What was missing was that the
-- system prompt never mentioned tools at all: the only instruction to use
-- `capture_lead` was one clause inside a long turn directive, after the brand
-- rules, the sources and the conversation history. That is enough for a large
-- model and not enough for a small one — and the bot is on small free models
-- until the account is topped up.
--
-- So the prompt names the tool, and says the thing that actually matters: the
-- claim and the act are one. A brand whose position is that it measures rather
-- than guesses cannot have an assistant that reports work it did not do.

insert into prompt_versions (lang, version, is_active, note, content)
select
  'en',
  4,
  false,
  'Names capture_lead and forbids claiming a save that did not happen.',
  content || E'\n\nRECORDING WHAT PEOPLE TELL YOU\n\nYou have a tool called capture_lead. Call it the moment someone tells you any\nof these, without waiting for the rest and without asking for them all at once:\ntheir name, a phone number or email, the band they need, their exam date,\nwhether they have done the placement assessment, or that they want to be told\nwhen the course material is published.\n\nNever tell someone you have recorded, saved or noted anything unless you have\nactually called the tool in this turn. If you cannot call it, say plainly that\nyou could not, and give them a way to reach Shabnam instead. Saying you did\nsomething you did not do is worse than not doing it.\n'
from prompt_versions
where lang = 'en' and version = 3
  and not exists (select 1 from prompt_versions where lang = 'en' and version = 4);

insert into prompt_versions (lang, version, is_active, note, content)
select
  'fa',
  4,
  false,
  'Names capture_lead and forbids claiming a save that did not happen.',
  content || E'\n\nثبت چیزهایی که به تو می‌گویند\n\nابزاری داری به اسم capture_lead. به‌محض اینکه کسی یکی از این‌ها را گفت صدایش\nبزن — منتظر بقیه نمان و همه را یک‌جا نپرس: اسمش، شماره یا ایمیلش، نمره‌ای که\nلازم دارد، تاریخ آزمونش، اینکه تعیین سطح داده یا نه، یا اینکه می‌خواهد وقتی\nمحتوای دوره‌ها منتشر شد خبردار شود.\n\nهرگز نگو چیزی را ثبت کردی، یادداشت کردی یا ذخیره کردی مگر اینکه واقعاً در همین\nنوبت ابزار را صدا زده باشی. اگر نتوانستی صدایش بزنی، صریح بگو که نتوانستی و راه\nرسیدن به شبنم را بده. گفتنِ کاری که نکرده‌ای، از نکردنش بدتر است.\n'
from prompt_versions
where lang = 'fa' and version = 3
  and not exists (select 1 from prompt_versions where lang = 'fa' and version = 4);

update prompt_versions set is_active = false where version = 3;
update prompt_versions set is_active = true where version = 4;
