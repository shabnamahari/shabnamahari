-- 0020 — her own name, where the bot prints it
--
-- With 0019's list in place the brand check still rejected three things from a
-- correct Persian answer, and all three were Shabnam: `SHABNAMAHARI` from the
-- Telegram handle, and `Shabnam Ahari` from the LinkedIn value. Both come out
-- of `contact_channels`, which the bot appends whenever it hands someone over.
--
-- The handle is fixed in the check rather than here, next to the email and the
-- URL it belongs with: an address exists in exactly one spelling and says
-- nothing about the language of the sentence around it. A display name is a
-- term, so it goes in the row with the others.

update settings
set value = value || jsonb_build_array('Shabnam Ahari')
where key = 'fa_latin_allowlist'
  and not value @> jsonb_build_array('Shabnam Ahari');
