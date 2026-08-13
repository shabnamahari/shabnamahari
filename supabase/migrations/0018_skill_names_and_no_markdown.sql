-- 0018 — the four skills keep their English names, and nothing is written in
-- Markdown
--
-- Two things Shabnam saw in the same Telegram answer.
--
-- The bot wrote «خواندن، شنیدن، نوشتن و صحبت کردن». Nobody says that. The four
-- IELTS skills are called Reading, Listening, Writing and Speaking in Persian
-- too, by her and by everyone sitting the exam — the knowledge base itself
-- writes them that way, and `settings.fa_latin_allowlist` has permitted them
-- since 0012. The Persian prompt was the one place that disagreed: it forbids
-- Latin mid-sentence and listed only three exceptions, so the model dutifully
-- translated the names of the things the whole course is about. The rule was
-- right and its exception list was short.
--
-- And every answer arrives wrapped in Markdown — `**تعیین سطح:**` — because
-- nothing ever told the model not to. Neither channel renders it: the web panel
-- prints plain text and Telegram is sent without a parse_mode, deliberately,
-- because one unmatched asterisk in an answer makes Telegram reject the whole
-- message. So the asterisks are simply shown to the reader as asterisks. Fixing
-- it at the source fixes both channels at once, which is the point of having
-- one brain.

insert into prompt_versions (lang, version, is_active, note, content)
select
  'en',
  5,
  false,
  'Plain text, no Markdown.',
  content || E'\n\nHOW YOU FORMAT\n\nWrite plain text. No Markdown: no asterisks for bold or italic, no backticks,\nno hash headings. What you type is shown exactly as you type it, so a `**` is\nread as two asterisks and nothing else. Use a blank line between paragraphs,\nand where a list genuinely helps, one short item per line.\n'
from prompt_versions
where lang = 'en' and version = 4
  and not exists (select 1 from prompt_versions where lang = 'en' and version = 5);

insert into prompt_versions (lang, version, is_active, note, content)
select
  'fa',
  5,
  false,
  'The four skills stay in English; plain text, no Markdown.',
  content || E'\n\nنام چهار مهارت\n\nReading و Listening و Writing و Speaking همیشه به همین شکل انگلیسی نوشته\nمی‌شوند، حتی وسط جمله‌ی فارسی. اینها اسم‌اند، نه کلمه‌ی انگلیسی که بشود ترجمه‌اش\nکرد: در فارسی هم همه — از جمله خودِ شبنم — همین‌ها را می‌گویند. «خواندن» و\n«شنیدن» ننویس. اسم دوره‌ها هم همین‌طور: Grammar and Vocabulary و Business\nEnglish و Plan Tracker و Skills for Band Score 6.5 به همان شکلی که هستند.\n\nچطور می‌نویسی\n\nمتنِ ساده بنویس. هیچ نشانه‌ی مارک‌داون به کار نبر: نه ستاره برای پررنگ کردن، نه\nبک‌تیک، نه علامت #. هرچه بنویسی عیناً همان‌طور نشان داده می‌شود، پس ** فقط دو تا\nستاره است و بس. بین پاراگراف‌ها یک خط خالی بگذار، و جایی که فهرست واقعاً کمک\nمی‌کند، هر بند را کوتاه و در یک خط بنویس.\n'
from prompt_versions
where lang = 'fa' and version = 4
  and not exists (select 1 from prompt_versions where lang = 'fa' and version = 5);

update prompt_versions set is_active = false where version = 4;
update prompt_versions set is_active = true where version = 5;
