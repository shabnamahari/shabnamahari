-- 0023 — warm words, written verbs
--
-- The Persian register was never decided, only demonstrated. The approved
-- sample in the build spec reads «دوره‌ها همه از یک پایه‌ی مشترک شروع می‌شوند و
-- بعدش برنامه ...» — written verb endings carrying one spoken connector. The
-- bot has been inferring that from the sources rather than being told it, which
-- works until a passage it is grounded in happens to be drier than usual.
--
-- Shabnam wrote the rule herself without meaning to, in the message asking for
-- it: «خب این خیلی خوبه، چن تا کلمه دیگه هم میتونه به این بیست اضافه کند ...
-- ولی یه جوری باشد که متناسب باشد». Spoken openers, spoken quantifiers, and
-- «کند» / «باشد» / «رسید» left whole. That is the pattern, and it is what goes
-- in below.
--
-- The verbs are the part that must not move. The brand guide's third trait is
-- authority from method, and its governing rule is hard on the work, soft on
-- the person — «نمره‌ات اینجا می‌سوزه» and «نمره‌ی تو اینجا از دست می‌رود» do not
-- weigh the same in the sentence that has to tell someone their Task Response
-- is incomplete. Warmth is carried by the pronoun, which the guide already
-- settled: «شما» until the relationship begins, «تو» from then on.
--
-- The restraint clause is not decoration. Given a list of warm words and no
-- limit, a model will use all of them, and «متناسب» was the actual request.

insert into prompt_versions (lang, version, is_active, note, content)
select
  'fa',
  (select coalesce(max(version), 0) + 1 from prompt_versions where lang = 'fa'),
  false,
  'Warm spoken connectors, written verb endings, used sparingly.',
  content || E'\n\nلحن فارسی\n\nفعل‌ها را کامل و نوشتاری بنویس: «می‌کند» نه «می‌کنه»، «است» نه «ـه»، «را» نه\n«رو»، «آن» نه «اون»، «می‌شود» نه «میشه». همین است که به حرفت وزن می‌دهد، مخصوصاً\nآنجا که باید حقیقتِ سختی را درباره‌ی کارِ کسی بگویی. نزدیکی از ضمیر می‌آید، نه از\nشکسته‌نویسی.\n\nولی خشک هم ننویس. این کلمه‌های گرم آزادند و بهتر از معادل‌های اداری‌شان\nمی‌نشینند: «خب»، «حالا»، «الان» به‌جای «هم‌اکنون»، «بعدش» به‌جای «سپس»، «تازه»،\n«راستش»، «یه» به‌جای «یک»، «یه‌کم» و «یه مقدار» به‌جای «اندکی»، «چند تا»، «همین».\n\nبه‌اندازه. یکی دو تا در کل یک جواب کافی است، و دو تا در یک جمله زیاد است. اینها\nمتن را گرم می‌کنند؛ پشت سر هم که بیایند، متن را سرسری می‌کنند.\n'
from prompt_versions
where lang = 'fa'
  and is_active
  and content not like '%لحن فارسی%';

-- Deactivate before activate: the partial unique index allows one active prompt
-- per language, and the other order collides with it after having already
-- turned the running prompt off.
update prompt_versions set is_active = false where lang = 'fa' and is_active;

update prompt_versions
set is_active = true
where lang = 'fa'
  and version = (select max(version) from prompt_versions where lang = 'fa');
