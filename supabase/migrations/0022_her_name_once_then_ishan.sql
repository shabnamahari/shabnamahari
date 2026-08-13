-- 0022 — say her name once, then «ایشان»
--
-- Asked how to start, the bot wrote: «شبنم در مورد مسیر مناسب برای شما و
-- جزئیات دوره‌ها با شما صحبت می‌کند. همچنین شبنم در ثبت‌نام خودِ آزمون هم به
-- شما کمک می‌کند.» The name twice in two sentences, and it reads like a
-- brochure describing a third party rather than someone talking to you.
--
-- Persian has the ordinary repair for this and English does not: after the
-- first mention you say «ایشان». Nothing told the model that, so it did what a
-- model does with a proper noun and repeated it.
--
-- «ایشان» rather than the spoken «ایشون», because the rest of the Persian
-- prompt and the approved Persian copy are in written register — «نمان»,
-- «می‌کند», «دهید» — and one colloquial word among them would be the only
-- thing in the answer that sounds like a different writer.
--
-- Per answer, not per conversation: a bot that says her name once and then
-- never again for twenty turns is as strange as one that says it every line.
--
-- Version numbers are read rather than assumed. The panel writes prompt
-- versions too now, so a migration that hardcoded "6 becomes 7" would either
-- collide with something Shabnam saved or silently do nothing.

insert into prompt_versions (lang, version, is_active, note, content)
select
  'fa',
  (select coalesce(max(version), 0) + 1 from prompt_versions where lang = 'fa'),
  false,
  'Her name once per answer, then «ایشان».',
  content || E'\n\nنام شبنم\n\nدر هر جواب، بار اول «شبنم» را بنویس. از آن به بعد در همان جواب «ایشان» بگو و\nاسم را دوباره تکرار نکن. تکرارِ اسم در جمله‌های پشت سر هم، متن را شبیه معرفیِ\nیک نفرِ غایب می‌کند، نه شبیه حرف زدن با کسی که روبه‌روی توست.\n'
from prompt_versions
where lang = 'fa'
  and is_active
  and content not like '%نام شبنم%';

-- Deactivate before activate. The partial unique index allows exactly one
-- active prompt per language, so the other order collides with it — correctly,
-- but after having already turned the running prompt off.
update prompt_versions set is_active = false where lang = 'fa' and is_active;

update prompt_versions
set is_active = true
where lang = 'fa'
  and version = (select max(version) from prompt_versions where lang = 'fa');
