# Sir Cue — decisions

Durable decisions from the chatbot sessions of 7–16 August 2026: the brief, the build,
and the content work that followed.

The build documents live in `chatbot /` (note the trailing space in the directory name):
`2026-08-07-chatbot-build-brief.md` is the decision record, `2026-08-08-chatbot-prompt.md`
is the build spec. This file records the decisions themselves — what Sir Cue is, how it
speaks, and what it is not allowed to do — separately from the specs that describe how it
was built.

The live system prompt is stored **in the database, not in code**, and is editable from
`/admin/prompt`. Changing it takes effect immediately, without a deploy; a migration is
what makes the change survive a rebuild from scratch.

---

## 1 · What Sir Cue is

**An answering assistant, not a teacher.** The bot exists so that people asking about
courses, programmes, registration and fees get an answer when Shabnam is not there. It
is explicitly **not** the first step of the diagnosis — an earlier framing that was
scrapped once the scope was settled.

It does not teach, does not diagnose, and does not give exam technique.

**The guardrail that matters most:** when someone asks a teaching question — *"how do I
improve my writing?"* — the bot does not answer it. It hands them to Shabnam. A
half-decent teaching answer from a chatbot devalues exactly what the practice sells. The
guardrail is commercial, not technical.

**It is not Shabnam, and does not pretend to be.** No avatar, no photograph of a person.
It says so in the welcome message.

**It ends where the brand's CTA ends:** it collects the target score and exam date and
hands the conversation over. It does not conclude anything.

---

## 2 · The funnel

Everyone is steered, indirectly, toward the **placement assessment** before any talk of
which course fits. The link already exists in the IELTS section of the site; the bot's
job is to lead people to it rather than announce it.

The approved framing:

> First we need to establish what your level actually is; then we get to which course
> suits you better.
>
> Placement is not just a score: it identifies which criterion is costing you marks, in
> which section, and by how much.

That second paragraph is the brand's argument, not a description — it is what separates
diagnosis from "we'll assess your level", which every competitor also says. It was
briefly cut and deliberately restored.

**Mechanics quoted to learners:** the written test is online and takes an hour; speaking
is 15 minutes; the result is given one hour after the speaking test, so someone taking
both on the same day has their result the same day. Placement is free. Nothing is
prepared in advance of it.

**Other course facts settled for the knowledge base:** both Academic and General are
taught; the computer-delivered test is recommended, not required; private sessions are
paid ten at a time, in full, before the block starts. No score is ever promised.

---

## 3 · Language

**English is the primary language; Persian is fully supported.** This was a technical
decision, not a translation exercise.

**Switching threshold** — a full sentence in the other language switches the
conversation from that message on; a short message, single word, number, email or link
does not; the language switch control and `/lang` always win unconditionally. Language
is stored on the conversation and is *sticky, not locked* — because language detection
on short messages is unreliable, and a learner who drops one Persian word into English
practice should not flip the whole conversation.

**No language changes mid-answer.** Two reasons: a bubble cannot be LTR and RTL at once
without the punctuation jumping, and a RAG model retrieving Persian chunks for an
English question will drift into Persian mid-sentence. The rule locks the sentence's
language, not individual terms — official IELTS terminology stays English inside Persian
answers, as does the tagline.

**Retrieval does not filter by language.** The knowledge base is largely English while
many questions arrive in Persian, so questions are embedded twice — once as written,
once translated. Without this the bot says "I don't know" while the answer sits in the
knowledge base, and nobody ever finds out why.

**Bubble side is set by role, never by language.** User on one side, bot on the other;
only the `dir` of the text inside changes. A bilingual conversation that switches sides
per message is unreadable. This is the first thing implementations get wrong.

---

## 4 · Persian register

**Settled 14 August 2026: the brand's Persian is written (نوشتاری), not colloquial** —
unless she changes her mind, which she reserved the right to do.

Verbs stay written (`می‌شود`, `می‌کند`). Warmth comes from connectors and small spoken
words — `بعدش`, `الان`, `یه`, `خب`, and `چی هست`, which is kept deliberately for warmth
and does not count as a broken verb. Written with a spoken seasoning; neither
bureaucratic nor colloquial.

**Applied 10 September 2026.** Her own knowledge base in `content/kb/*.fa.md` had
been written colloquially throughout, which is what the bot was copying. Shabnam's
edited rewrite now *is* those nine files — there is no separate rewrite document to
consult, and the colloquial forms are gone from the source. `spokenVerbForms` in
`evals/brand.eval.ts` therefore now measures what it was written to measure, rather
than failing answers that faithfully matched her own content.

Three reasons this held: the brand guide's own address-and-register section locates
intimacy in the pronoun rather than in contraction; the knowledge base she wrote herself
is in written Persian, and a colloquial instruction over written sources produces hybrid
output worse than either; and authority — saying the hard thing — carries better in
written Persian.

**Address:** `شما` in the first reply, `تو` from the second onward. The brand is a
person, not an institution, and `شما` builds exactly the institutional distance the
brand rejects.

**Referring to Shabnam:** `شبنم` the first time in an answer, `ایشان` after that. The
counter resets each answer — a bot that says her name once and then "ایشان" for twenty
turns is as strange as one that repeats the name. `ایشان`, not `ایشون`, to match the
written register. One fixed line is exempt and stays as she wrote it:
*«این‌ها راه‌هایی هستند که می‌توانید از طریقشان با شبنم در ارتباط باشید»*.

**No Latin script inside Persian sentences.** آیلتس, not IELTS. `نمره‌ی ۷`, not Band 7.
English only where no established Persian equivalent exists.

The allowed exceptions are **one list in the database**, read by both the prompt and the
brand test, so the instruction and the check can never drift apart:

> Reading · Listening · Writing · Speaking · Grammar and Vocabulary · Business English ·
> Plan Tracker · AI & IELTS · Skills for Band Score 6.5 · Skills for Band Score 7 and
> Above · Google Meet · Academic · General · Telegram · Email · LinkedIn ·
> Shabnam Ahari · Sir Cue · Your goal speaks English.

Duplicating any of these into the prompt is the mistake this design exists to prevent.

**English pronoun:** always `you`. There is no register question on the English side.

---

## 5 · Knowledge base

**Source: a crawl of the whole site, plus PDFs.** Re-crawlable from the admin panel.

**Content is hers, and answers are complete sentences.** The FAQ was filled in by her in
a document, then edited: answers addressed to "you" as the bot were rewritten to address
the learner, and every heading-like fragment was rewritten as a full sentence.

**The unanswered-question loop is first-class, not a nice-to-have.** With a small
knowledge base the bot reaches "I don't know" often, so unanswered questions feed back
into the knowledge base as the primary way it grows.

**While the site has no content yet:** questions about content get an honest answer that
material is coming soon, and the bot collects a phone number so those people can be
messaged when it lands.

**Wording settled for the knowledge base:** "offline" in Persian, "pre-recorded" in
English, for the same thing. Instagram is removed from the contact options entirely —
the account is private. Both *learner* and *student* are acceptable words.

---

## 6 · Conversation surface

**The widget is the primary surface, not the full page.** People ask from the page they
are already reading. The full page was built first only because it is easier to debug.

**Opening state carries suggestion chips.** With a limited knowledge base, the first
question decides whether the bot succeeds, and "how can I help?" leaves that to chance.
The chips are her five topics, each carrying a question the knowledge base can actually
answer.

**Feedback: 👎 only, per answer, in white.** No 👍 — a thumbs-up produces nothing she
would act on, and the panel works from the list of negatives. Per-answer rather than
per-conversation, because a conversation has no end (people close the tab), and because
a 👎 on a specific answer, next to the sources that answer used, tells her *where* it
broke rather than only that it did. A 👎 offers one optional line: what was wrong.

**Sources are quiet but linked** — one small Muted Ink line naming the page, linking to
it. It evidences the claim and sends the reader to the site.

**Handover is a designed moment, not a sentence in a paragraph.** When the bot decides
this is something Shabnam should see, that gets its own block and its own button.

**No emoji chrome, no bouncing dots.** Streaming text is its own progress indicator. The
system cursor comes back inside the widget, since the site otherwise hides it.

---

## 7 · Routing and models

| Destination | For | Goes to |
|---|---|---|
| "Start here" CTA | reaching **her** | `@SHABNAMAHARI` |
| Reach out → Telegram | reaching **her** | `@SHABNAMAHARI` |
| Bot icon | reaching **the bot** | `@SirCue_bot` |

Her Telegram and the bot are separate destinations and must stay separate. The "start
here" CTA previously pointed at `mailto:hello@adcker.com`, an address that never existed.

**Models offered in the panel:** Gemini 3.5 Flash · Gemini 3.1 Flash Lite ·
Gemini 2.5 Flash · Haiku 4.5 (Anthropic) · GPT-5 Mini (OpenAI), via OpenRouter.

**Currently running on free models** pending an OpenRouter top-up. Answer quality is not
a fair basis for judging the bot — or its Persian tone — until that changes.

---

## 8 · The system prompt lives in the database

The prompt is not a file in this repo. It is the active row in `prompt_versions`,
one per language, and `getActivePrompt(lang)` reads it on every turn.

**To change it, write a new version and activate it — never edit the active row
in place.** The table is versioned (`version` is monotonic per language, and a
unique index enforces exactly one active row per language) so that a bad prompt
is a one-click rollback rather than a rewrite from memory. The panel at
`/admin/prompt` does this correctly: it inserts a new version, activates it, and
records who changed it and why. A direct `update` on the live row throws that
history away and is the one edit to avoid.

Then run `npm run prompts:export`, which copies the two live prompts into
`docs/prompts/fa.md` and `docs/prompts/en.md` so the text the bot actually speaks
with is readable in a diff. Those files are copies and say so in their own
header — editing one changes nothing.

## 9 · What the chatbot actually uses

Checked against the ingest scripts, the chat route and the `documents` table on
11 September 2026 — 24 documents, from two sources.

**Used — the bot answers from these**

- `content/kb/*.md` — 18 documents, 9 Persian and 9 English. Ingested by
  `scripts/ingest-content.ts` (`npm run kb:content`), keyed `content://kb/<file>`
  so a re-run replaces rather than duplicates. A file removed from the directory
  is deleted from the knowledge base on the next run.
- **Six crawled site pages** — `/`, `/about`, `/learn`, and the three Program
  pages. Ingested by `scripts/crawl-site.ts` (`npm run kb:crawl`), keyed by real
  URL. **The site's own copy is a source too**: editing a page and redeploying
  changes what the bot can say, but only after a re-crawl.
- **The system prompt** — the active row in `prompt_versions`, one per language,
  read by `getActivePrompt(lang)` on every turn. See section 8.
- **The knowledge panel** at `/admin/knowledge` writes to the same table, and can
  edit any document whose `source_type` is `text` — which is exactly the
  `content/kb` set. Note the trap: a panel edit changes the database row, and the
  next `npm run kb:content` overwrites it from the file. The file wins. Edit the
  file, or accept that the edit lasts until the next ingest.

**Not used — documents, copies and backups the bot never reads**

- `docs/prompts/fa.md`, `docs/prompts/en.md` — exports for reading in a diff,
  written by `npm run prompts:export`, read by no code.
- `docs/CHATBOT.md` (this file), `docs/BRAND.md`, `docs/kling-prompts.md`.
- The repo-root `chatbot /` folder — the build brief, the prompt document, the
  content-gaps note.
- Everything in `mywebsite. personal/chatbot knowledge base/` — the documents are
  dated and named for what they are: `2026-09-11-chatbot-content-persian.*` (the
  rewrite that became the nine Persian files),
  `2026-09-11-chatbot-content-english.*`, and `2026-08-12-chatbot-faq-answers.md`.
  Also the tasks document and its `.build/appendix-kb.md`.
  These are the documents the knowledge base was written *from*, not the
  knowledge base. Nothing in the codebase reads that directory.
- `evals/` — tests, not a runtime source.

**To change the bot's answers, edit `content/kb/` and run `npm run kb:content`;
to change the prompt, write a new version in the database rather than editing
the active one.**

## 10 · Still open

- **OpenRouter credit.** Blocks the 20 paid brand evals and the request-limit / spend-cap
  work, which must ship *with* the top-up rather than after it.
- ~~**The Persian rewrite.**~~ Done 10 September 2026: her edited version was written into
  `content/kb/*.fa.md` and `npm run kb:content` rebuilt retrieval from it.
- **The real FAQ.** The knowledge base still needs her actual most-asked questions.
- **Panel: model settings and the playground**, and the Embedding section, which was
  never started.
