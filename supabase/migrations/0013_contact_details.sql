-- 0013 — how to reach Shabnam
--
-- Kept in settings rather than in the knowledge base, and injected into every
-- turn, because the moment the bot needs this is exactly the moment retrieval
-- has failed. A refusal — "that is the part Shabnam does herself" — is only
-- useful if it can finish the sentence, and testing showed both failure modes:
-- the English answer printed a bracketed placeholder to the reader, and the
-- Persian one invented an Instagram account and an email address.
--
-- Instagram is deliberately absent. Shabnam's account is private and not for
-- work, so an assistant sending people there would be sending them somewhere
-- she does not want them.

insert into settings (key, value, description) values
  (
    'contact_channels',
    '[
      {"label": "Telegram", "value": "@SHABNAMAHARI", "url": "https://t.me/SHABNAMAHARI"},
      {"label": "Email", "value": "aharishabnaam@gmail.com", "url": "mailto:aharishabnaam@gmail.com"},
      {"label": "LinkedIn", "value": "Shabnam Ahari", "url": "https://www.linkedin.com/in/shabnam-ahari-372573101"}
    ]'::jsonb,
    'Every way to reach Shabnam, and the only ones the bot may offer. Instagram is not here on purpose: the account is private and not for work. The bot is told never to invent a channel that is not on this list.'
  ),
  (
    'contact_handoff_note',
    '{
      "fa": "این‌ها راه‌هایی هستند که می‌توانید از طریقشان با شبنم در ارتباط باشید.",
      "en": "These are the ways to reach Shabnam directly."
    }'::jsonb,
    'The line the bot uses when it hands someone over. Written by Shabnam in Persian; the English is a plain equivalent, not a translation of an idiom.'
  ),
  (
    'price_policy',
    '"refer"'::jsonb,
    'What the bot does about price. "refer" means prices are never stated in chat and the person is pointed at Shabnam — her decision, on the grounds that prices are not settled yet. The other values this may take later are "state" and "range".'
  )
on conflict (key) do update
  set value = excluded.value,
      description = excluded.description,
      updated_at = now();
