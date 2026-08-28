# Design Plan — shabnamahari.com

Written 28 August 2026, against `DESIGN_AUDIT.md`, `2026-08-10-brand-guide.pdf`
(Brand Foundation v1) and `CLAUDE.md`.

No code has been changed. This document proposes three directions for the
nineteen High-severity findings, and a build order. **Choose a direction before
step 9.** Steps 1–8 are correct under all three.

> **A warning about the brand guide's Persian.** The Persian lines in the PDF
> extract as reversed presentation forms — `pypdf` gives back
> `.ﻧﺪﮔﯽز ﯾﮏ ه،ﻧﻤﺮ ﻧﯿﻢ` for what is actually «نیم نمره، یک زندگی». Any Persian
> copy taken from that PDF must be re-typed by reading the rendered page, never
> pasted from an extraction. Shipping a reversed Persian string is the one
> mistake in this project that Shabnam's audience would notice and nobody
> reviewing in English would catch.

---

## What the three directions are actually choosing between

The audit's nineteen High findings collapse into one question asked three ways:

**The site has an empty centre.** A grey box in the hero, five stock photos
labelled as evidence, no method on any page, the conversation hidden in a
footer, and no Persian anywhere. Every High finding is a symptom of that one
hole. Filling it with a video, filling it with an artefact, and filling it with
a conversation are three genuinely different businesses — different production
cost, different elapsed time, different thing the visitor believes.

That is the choice. Not a look.

---

## Direction A — The Diagnosis Runs The Page

*The site's claim is that preparation begins with a measurement. Stop
describing that and perform it in the first viewport.*

### What replaces the empty hero

The `( … )` parenthesis keeps its job as the site's signature mark — it is the
one genuinely ownable gesture on the site (§6.5) and nothing here touches it.
But instead of framing a video that does not exist, it frames the diagnosis
question: **two fields, target band and exam date.** Nothing else. No name, no
email, no password.

`components/Hero.tsx:9` and `components/HeroVideoReveal.tsx` stop being a
placeholder for missing media and become the primary conversion surface. The
tagline stays exactly where it is, at `.text-h1`, uppercase Kumbh 700 —
`Your ( 7.0 · March ) goal speaks English`, with the visitor's own two facts
sitting inside the parenthesis as they type.

This is the guide's own CTA construction (p.16) rendered as an interface rather
than as a sentence: *"The CTA is a question, not an offer… two facts is lower
friction and produces a reply that can be worked with. More importantly, it is
the product — the diagnosis performed rather than described."*

**It ships without a photo shoot.** That is the direction's central argument.

### How proof of teaching ability enters the page

Method, not credentials. The guide is explicit (p.13, trait 03): *"authority is
carried by method until the intake log has produced a real number."* The intake
log has not produced one yet (p.19 sets review at 28 October 2026), and
p.18 BAN ONE forbids inventing one.

`content/kb/how-it-works.en.md` and its `.fa.md` pair already contain the
method, in her voice, and it is good. It gets a real route and becomes the
page directly under the hero: *which criterion is costing you marks, in which
section, and by how much.* Plus the approved line the guide wrote for the About
page and nobody used (p.17): *"I read your writing the way an examiner does —
in four minutes, hunting for reasons to deduct."*

Proof here = **the exact procedure, stated before payment.** A sceptic can
check it against what happens next.

### Where the Telegram CTA sits

**It is the hero.** Submitting the two fields composes a prefilled Telegram
message — `t.me/SHABNAMAHARI?text=…` carrying the band and the date — so the
visitor arrives in the conversation with the diagnosis question already asked.
No typing, no blank chat box.

The footer link survives as the plain "just message me" path, relabelled to say
Telegram, to say it reaches Shabnam and not the bot, and to say it is free
(§4.4). The `AuthSignUp` panel moves below it — the account is for enrolled
students, not for strangers (§4.3).

### How Persian and English coexist

**Minimum viable bilingual, and honest about it.** Three surfaces get a Persian
twin: the hero, the method page, and contact. Not the whole site.

- The tagline stays English inside Persian copy — p.5, non-negotiable, well
  argued: *"a mark that changes shape by language is two marks."*
- The two field labels and the method are Persian-first, because they are
  explanation, and p.3 assigns explanation to Persian.
- Vazirmatn 900 for display, 300 large for the editorial layer (p.10). Both
  currently unloaded (§7.4).
- `dir` set per route; the two-field form is the smallest possible RTL surface
  to get right, which is the point of starting here (§7.3).

### Cost, and who this is for

Roughly two weeks of build, no production dependency, nothing waiting on a
camera. It converts the visitor who already half-trusts her — Behruz, who has
sat the exam and come up half a band short and knows exactly what he wants to
ask.

It is weakest on the five-second question. A form is not evidence. Someone who
has never heard of her still leaves without seeing her face or her work.

### Brand guide stance

Compliant throughout, and closer to a first faithful execution of the guide
than a departure from it. One real tension: a form in the hero risks becoming
furniture, and p.9 keeps the one saturated colour *rare*. So the fields are
Cream, Rule and Ink; Signal Red appears only on the cursor and on the submit's
motion, never as a fill. That is the opposite of what `--auth-fill` does today
(§6.4).

---

## Direction B — Evidence First

*She has no numbers and no testimonials. She does have her marking. Build the
page around the artefact.*

### What replaces the empty hero

The thing the guide already commissioned. p.12 names it twice, once as a prop
brief and once as a generation prompt: *"A marked-up essay with dense margin
annotations… An empty laptop says nothing about this brand. A page covered in
marking says everything."*

A 16:9 loop — hands, a printed essay, a deep blue pen, hard raking side light,
shadow with an edge. `HeroVideoReveal.tsx:12-60` is genuinely good scroll
choreography currently spent revealing a grey rectangle; it finally has
something to reveal.

**Ship a still first.** A single 3:2 frame drops into the same slot with the
same code, and the clip replaces it later without a rebuild. That de-risks the
one dependency this direction has.

### How proof of teaching ability enters the page

**One marked script, rendered as a page.** A real anonymised Task 2 response
with her margin annotations, and beside each annotation the official band
descriptor it traces back to.

That is the positioning statement (p.4) turned into an object you can look at:
*"every judgment traces back to the official band descriptors."* The audit
notes that the phrase *band descriptors* — on the approved-words list, p.18 —
appears **nowhere on the site** (§3.3). Here it is the page.

The five picsum thumbnails (`components/Quote.tsx:6-12`) are replaced by five
tight crops of real marking. Same grid, same `( 01 )`…`( 05 )` captions, same
greyscale-to-colour mechanic — and now every one of p.11's four lighting rules
is doing work, because there is finally a photograph for them to govern.

### Where the Telegram CTA sits

**At the end of the evidence, and pinned after it.** The visitor has just
watched four minutes of her judgment compressed into a page; the CTA is the
obvious next beat — *that was someone else's writing. Send me yours.*

Then `components/Header.tsx:30-59`, which today contains the single word
`Menu` on every page, gains a persistent Telegram control that appears once the
visitor has scrolled past the proof section. Not before — an unearned sticky
CTA is exactly the SaaS reflex this site is good at avoiding.

### How Persian and English coexist

**The annotations are the bilingual surface, and they are the argument.**
The essay is English. The margin notes are Persian. The band descriptor is
English, quoted verbatim because it is the official instrument.

That is p.3 — *"Persian for explanation, English for the standard"* — not
implemented as a translation layer but demonstrated in a single image. It is
the most persuasive possible answer to the bilingual question, and a Persian
speaker understands the whole proposition from that one artefact without
reading a word of marketing copy.

Marketing chrome goes bilingual afterwards, as a normal locale project.

### Cost, and who this is for

Three to four weeks, and one hard dependency: a shoot, plus **written consent
from a student** to publish their script even anonymised. That consent is the
real risk in this direction and it should be secured before any build starts —
if it falls through, the page has no content and the direction collapses to A.

It converts the sceptic. Elham, who paid for a cheap course she never finished
and does not believe claims any more. p.8 is explicit that she *"still believes
demonstrations."*

### Brand guide stance

The only direction that satisfies p.11–12 rather than working around it. Every
rule in that brief — hard directional light, saturated cool note, no red in
frame, deep blue marking pen, half very tight and half very wide — exists to
serve photographs that do not currently exist. This direction is the guide's
photography chapter finally having a subject.

---

## Direction C — The Persian Front Door

*Treat §7.1 as the top finding rather than §3.1. Today the customer cannot read
the site at all.*

### What replaces the empty hero

**Nothing. The slot is deleted.**

This is the direction's most contentious move and it is deliberate. The grey
box has been a promise of media for long enough; removing it is more honest
than filling it badly, and it costs nothing and waits on nobody.

What takes the viewport instead is the pairing the guide describes on p.10 and
the site has never once rendered: the tagline in Kumbh 700 at display scale,
and beneath it the Persian promise in **Vazirmatn 300, set large** — the
editorial layer built from weight rather than from a serif, exactly as p.10
specifies and warns will otherwise be invented wrongly by the next person.

The `( … )` parenthesis frames the language fork. Two words, «فارسی» and
`English`, in the site's own signature mark. The first thing the site does is
ask which language you want to be judged in — which is, not incidentally, the
brand's entire subject.

### How proof of teaching ability enters the page

**The assistant, promoted from a chat widget to the page's second act.**

The audit is blunt that this is the best asset on the site and the worst-used
(§4.5): it knows the method, carries the pricing policy, speaks Persian
properly — `Assistant.tsx:93` even documents why the Persian title is
«از کجا شروع کنیم؟» rather than a literal translation — and it is a two-word
lowercase label reading `ask me` that most people will scroll past.

It moves into the flow at full width, and its three opening chips change from
*Registration · Course details · Payment & fees* — three administrative
questions nobody is actually asking — to the sceptic's real one: **can you get
me from 6 to 7 by March.** Its answer renders inline on the page.

Proof here = **a demonstration you can interrogate, in your own language.**
It is the only form of proof on offer that answers the visitor's specific
question rather than a general one, and the nine bilingual documents in
`content/kb/` — currently invisible to anyone who does not open a bot and guess
the right question (§3.3) — become the substance of the home page.

### Where the Telegram CTA sits

**Emitted by the conversation.** The handoff fires at the one moment the
visitor has told her something real — after they have named a band and a date
inside the chat. The CTA arrives having earned itself, and it arrives carrying
context.

A static Telegram control sits in the header for people who will not type,
labelled properly and distinguished from `t.me/SirCue_bot` — which today is
labelled *"Also on Telegram"* beside Shabnam's own link labelled *"Telegram"*,
a confusion the code comments worry about and the interface does nothing about
(§4.4).

### How Persian and English coexist

**Fully, and this is the direction's whole point.** `/fa` as a first-class
root, not a translation of an English site.

- Locale routing; `dir` and `lang` per document (`app/layout.tsx:141` currently
  hardcodes `lang="en"` for the entire application).
- `lib/projects.ts` — the site's content model — gains a locale concept. Its
  type at `:22-47` has none today, which means every consumer changes.
  `content/kb/` already solved this with `.en.md`/`.fa.md` pairs; the marketing
  model never learned from it.
- Every physical `left`/`right` becomes logical. This is the bulk of the work:
  the marginal notes, the asterisk pinned left on five heroes, `WorkEntry`'s
  four breakpoint overrides each, `.body-link::after`, and
  `.hover-expand-row`'s numbered grid columns, which do not flip with direction
  (§7.3).
- The Latin metrics get replaced or bypassed. `FitOneLine.tsx:44` measures at
  ≈0.534em per glyph and the lesson page at 0.72em per uppercase character;
  both feed `overflow: hidden`, so on Persian the failure mode is titles with
  their ends sliced off.
- `uppercase` and `-0.05em` are removed for Persian. Persian has no case, and
  negative tracking on Arabic script breaks the letter joins — it is damage,
  not tightening. `line-height: 0.78` must go too, and the hero cap arithmetic
  at `globals.css:278-287` divides by that same figure, so the fit calculation
  is wrong as well.

### Cost, and who this is for

Six weeks and by far the largest of the three, and most of it invisible —
weeks of work that produce no new screenshot. Also the highest ceiling: it is
the only direction after which the site can be shown to a monolingual Persian
speaker without apology.

It converts the person the site was built for and currently cannot serve.

### Brand guide stance

Compliant, but it runs past the end of the guide. **The brand guide predates
the chatbot and does not mention it.** p.19's "Still Open" section covers brand
personality and persona validation and says implementation is tracked
elsewhere — but a conversational surface that answers in her voice, in two
languages, is not implementation. It is a voice channel with no entry in a
voice document. If this direction is chosen, p.13–14 need a fourth column for
it before it is promoted to the home page.

---

## Where I would argue the guide should be broken

Three places. Two are real breaks; the third is a gap the code has already
filled without permission.

### 1. p.9 — "Confirm · Form success only. Never marketing." Break it, by amending it.

The audit's §1.2 reads as a straightforward violation: `--color-confirm` is a
heading colour on the About page, the hero of every lesson page, and the
full-bleed wordmark on every page in the site. Green has been quietly promoted
from a signal to a brand colour, which is the exact failure the rule prevents —
by the time a student submits a form, green means "heading".

But **the rule is unlivable as written, and that is the guide's fault, not the
code's.** p.9 gives the site one saturated colour, forbids it at body size
(3.0:1 on cream), reserves it for motion, and instructs the designer not to add
any others. That leaves a monochrome site with no second voice at all. The code
went looking for one and took the only saturated value left in the palette.

The fix is not to strip the green. It is to name a second colour and give
Confirm its job back — and **the guide has already named it, on the facing
page.** p.11 specifies the marking pen as *"deep blue or graphite, never red"*,
and the two-state colour direction names *"teal, deep blue, forest green"* as
the cool notes that wake up on hover. Deep blue is already sanctioned brand
colour; it is simply not in the palette table.

Note the internal contradiction this exposes: **forest green is on p.11's
approved list of photographic reveal colours and banned on p.9 as a marketing
colour.** The same hue is both the brand's cool note and its untouchable form
signal. That was never reconciled, and it is why this finding happened.

*Amendment: add Deep Blue to the p.9 palette as the second brand colour with
a measured contrast figure. Return `--color-confirm` to form success only.
Shabnam picks the hue; it should be sampled from a real marking pen.*

### 2. p.11 — "Every image therefore has two states, and both are seen by every visitor." Break it, because it is false.

This sentence is load-bearing. Four photography rules descend from it: hard
directional light so greyscale survives, saturated colour so the reveal is
worth the hover, one cool wardrobe note as the thing that wakes up, no red in
frame because the cursor floats above.

`globals.css:431-439` implements it as `:hover` only. On a touch device it
never fires. **Every photograph on the site is permanently greyscale for the
majority of this audience** (§5.2), and every one of those four rules is
serving an interaction most visitors will never trigger.

*Amendment: rewrite the mechanic, not the sentence. On `hover: none`, colour
resolves on scroll-into-view. The two states stay real, the four rules keep
their reason, and the guide becomes true again — which is better than
downgrading p.11 to "colour is a desktop reward."*

### 3. p.10 — Inter is a sixth family and the guide does not know. Close the gap.

`app/layout.tsx:23-27` loads Inter as `--font-grotesk` for the kinetic tiles.
The comment is honest about why — Kumbh does not do the neo-grotesque look the
motion reference wants — but the result is that three of the loudest elements
on the home page are set in a face that appears nowhere in the brand's type
system (§1.8). Either write it into p.10 as a motion-only fourth layer, or set
the tiles in Kumbh and lose the reference. Silently running six families in a
three-layer system is the option that is not available.

### And two rules I would not break

**p.5, the tagline is never translated.** Well argued and it should hold in all
three directions. A mark that changes shape by language is two marks.

**p.10, the governing rule — no comfortable middle sans.** `.text-body-h2`
(`globals.css:333-343`) breaks it at desktop by becoming Instrument Sans 21px,
and the correct response is to delete it, not to license it. It is currently
dead code, which makes this free (§1.3).

---

## Prioritized plan

Ordered by perceived-quality gain per unit of effort. Every step ships on its
own branch and stands alone. Effort figures are rough and assume no
regressions.

Memory note: branch and open a PR for each; nothing straight to main.

### Steps 1–8 — correct under all three directions. Start here regardless.

**1 · Delete the picsum "work samples."** — *1 hour*
`components/Quote.tsx:6-12,33-40` and the three cover seeds at
`lib/projects.ts:64,101,137`. Five random third-party photographs, named after
another agency's clients, captioned `Work sample 01–05`, sitting directly under
the best sentence on the site — and they intermittently fail to load, and they
are unreachable from Iran entirely. **Ship the USP alone with air around it.**
Nothing replacing them is better than what is there now. *(§3.2, §6.2, §8.4)*

**2 · The voice sweep.** — *1 hour*
`"Our services"` → `"What I do"` (`Services.tsx:19`). `"The minds behind"` →
singular (`about/page.tsx:51`) — it is currently a studio's label sitting beside
a photograph of one woman, above her own name. `"More about our Programs"`
(`about/page.tsx:95`). `"Index"` → `"Home"` — its own menu note already
translates it. `"Other Programs you might be interested in"`
(`learn/[slug]/page.tsx:118`). Every one contradicts a rule the guide states
twice (p.3, p.14). Two edits, ten words, on the two pages people actually read.
*(§6.1)*

**3 · Make the Telegram CTA the loudest thing in the footer, and say what it
is.** — *half day*
Today the footer ranks: a six-letter back-to-top button at 48vw, then an email
capture in red glass, then the way to reach a human being at 16px underlined.
Invert it. Promote the CTA to `.text-h2`, move it above `AuthSignUp`, and tell
the visitor before they press: that it is Telegram, that it reaches Shabnam and
not `SirCue_bot`, and that it is free. The copy itself is already the guide's
own construction and needs no rewrite. *(§4.2, §4.3, §4.4)*

**4 · Put email first and Google second in sign-up.** — *30 minutes*
`components/AuthSignUp.tsx:305-355`. Google OAuth is the visually dominant
first option and is unreachable from Iranian IP ranges without a VPN. For half
the audience the primary path hangs, and they find the working one only after a
failure they will read as *this site is broken*. The fallback exists, is
correctly worded, and is labelled in the code as *"the slower way in."* Reorder
two blocks. Highest ratio of functional repair to effort in this document.
*(§8.1)*

**5 · Fix the mobile experience.** — *half day*
Three changes, one branch. Colour on scroll-into-view under `hover: none`, so
photographs are not permanently grey for most visitors (§5.2 — see guide
amendment 2 above). Restore `"You will reach your"` (`Hero.tsx:43`), the only
sentence in the mobile hero that makes a promise. Give the three kinetic tiles
a visible affordance — they are the primary navigation into the product pages
and on a phone they are three silently animating black squares with no label,
no cursor and no hover state (§5.1).

**6 · Write the method onto a page.** — *1–2 days*
`content/kb/how-it-works.{en,fa}.md` already contains the method, in her voice,
and it is the best answer on the site to the five-second question. It is
reachable only by opening a chatbot and asking the right question. Give it a
route. **The source is already bilingual, so this is the one substantial
content step that ships in both languages for free** — which makes it the
highest-value large item in the document and a real test of the Persian
typography before anything depends on it. Add the About-page line the guide
wrote and nobody used: *"I read your writing the way an examiner does — in four
minutes, hunting for reasons to deduct"* (p.17). *(§3.3, §3.4)*

**7 · Bilingual groundwork.** — *half day*
Invisible today, mandatory before any Persian ships, and cheap now. Add `"900"`
to the Vazirmatn weights at `app/layout.tsx:61-66` — the Persian display layer
literally cannot be set until this one-word change lands, and every type
decision made in the meantime is calibrated against the wrong weight. Add
`"300"` handling for the editorial layer. Set `dir` and `lang` correctly, and
`dir="auto"` on assistant messages so Persian containing a band score or an
email address stops bidi-reordering unpredictably. *(§7.4, §7.5)*

**8 · Spacing tokens, and the dead classes.** — *1 day*
Six tokens absorb every spacing literal in the codebase — the values are
already nearly a scale (15/30/50/60/100/200). The visible payoff is one fix:
`Quote` breathes at half the rate of the sections either side of it, and
`Quote` is the section holding the USP, so the most important sentence on the
home page gets the least air. While in there: delete `.text-body-h2` (dead, and
it breaks p.10's governing rule at desktop), tokenise the five radii, and
rename `--font-nhm` / `--font-psl` / `--font-psr`, which name self-hosted faces
that no longer exist and make the guide's resolved licence exposure look open.
*(§1.1, §5.3, §1.3, §1.5, §1.7)*

### Step 9 — the fork. Choose a direction here.

**9 · The hero and the proof.** — *A: ~2 weeks · B: ~3–4 weeks · C: ~6 weeks*
This is the empty centre, and the three directions above are three ways to
fill it. It is the largest step in the document and the one that changes what
the site is.

If **B**, secure the student's written consent to publish an anonymised script
*before* any build starts — it is the direction's single point of failure.
If **C**, amend p.13–14 to cover the assistant before promoting it.

### Steps 10–12 — after the fork.

**10 · The second brand colour.** — *decision, then half a day*
Shabnam's call, not a code change: name a second colour (deep blue, sampled
from a real marking pen — see guide amendment 1) and return `--color-confirm`
to form success only. The mechanical part is small; the decision is not, and it
should be written into p.9 with a contrast figure rather than made in a
stylesheet. *(§1.2)*

**11 · Full locale routing and the content model.** — *2–4 weeks*
Only if the chosen direction did not already do it. `lib/projects.ts` gains a
locale concept, every physical `left`/`right` becomes logical, the Latin glyph
metrics stop governing Persian titles, and `uppercase` / `-0.05em` /
`line-height: 0.78` stop being applied to Arabic script. Large, invisible, and
the precondition for the site serving the audience it was built for. *(§7.1,
§7.2, §7.3)*

**12 · `schema.org` Person.** — *1 hour*
`jobTitle`, `knowsLanguage`, `sameAs` pointing at the LinkedIn URL already in
`components/Footer.tsx:26-27`. Close to free, and it is what makes a search
result show a person as a person — which matters for a brand whose whole
proposition is *trust this individual*. Deferred only because nothing on the
page is worth indexing until step 6 lands. *(§3.5)*

### Deliberately not in this plan

**`( in production )` on all eighteen lesson panels** (§2.5) and the placeholder
courses behind `/myaccount`. These are not design problems and no layout change
fixes them. A visitor four clicks deep arrives at a photograph, a title, the
words "in production", and a request to create an account — the honest fix is
either to build the lessons or to stop routing to them, and that is a product
decision.

**Hiding the Business English industry grid** (§6.3). Six pre-built buckets
sorted by job title is structurally the opposite of the brand's position, but
removing routes needs Shabnam's explicit sign-off per `CLAUDE.md`.
