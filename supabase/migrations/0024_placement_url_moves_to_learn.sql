-- 0024 — the placement link follows the section that moved
--
-- The bot printed /work/ielts/placement-assessment in a real conversation and
-- Shabnam did not recognise it, because nothing on her site is called "work".
-- The bot was right and the address was wrong: /work was the portfolio
-- template's name for the section the menu calls Learn, and no visitor ever
-- saw the word — only the assistant, which prints real addresses.
--
-- The routes are now /learn/*, with permanent redirects from the old ones, so
-- the value below was never broken. It is updated because the address a person
-- is handed should be the address, not a forward.
--
-- Guarded on the old value rather than replacing unconditionally: this row is
-- editable, and a migration that overwrites whatever it finds would undo a
-- change made from the panel.

update settings
set value = '"/learn/ielts/placement-assessment"'::jsonb,
    updated_at = now()
where key = 'placement_url'
  and value = '"/work/ielts/placement-assessment"'::jsonb;
