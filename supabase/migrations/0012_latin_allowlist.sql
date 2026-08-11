-- 0012 — the words that stay in Latin script inside Persian
--
-- Persian answers carry a hard rule: no Latin letters mid-sentence. «آیلتس»,
-- not IELTS. «نمره‌ی ۷», not Band 7.
--
-- But a few terms have no settled Persian equivalent, and the four exam
-- sections are the clearest case — a Persian speaker preparing for the exam
-- says Writing, not «نوشتار». Forcing a translation there would make the bot
-- sound less fluent than the people it is talking to, not more.
--
-- A list rather than a set of cases in the prompt, because it will grow. It is
-- read at request time and used in two places: the prompt tells the model these
-- are permitted, and the eval suite uses the same row as the allow-list for its
-- no-Latin-in-Persian check. One source, so the test can never disagree with
-- the instruction.

insert into settings (key, value, description) values
  (
    'fa_latin_allowlist',
    '[
      "Reading",
      "Listening",
      "Speaking",
      "Writing",
      "Sir Cue",
      "Your goal speaks English."
    ]'::jsonb,
    'Terms allowed to keep their Latin form inside Persian answers, because no settled Persian equivalent exists. The four exam sections are here for that reason; the bot name and the tagline are here because they are fixed marks that must not change shape by language. Add to this list rather than writing exceptions into the prompt — the eval suite reads the same row.'
  )
on conflict (key) do update
  set value = excluded.value,
      description = excluded.description,
      updated_at = now();
