# Design Audit — shabnamahari.com

Audited 28 August 2026, against `2026-08-10-brand-guide.pdf` (Brand
Foundation v1) and `CLAUDE.md`.

Read-only audit. No code was changed.

Severity key — **High**: costs money, credibility or comprehension right
now. **Medium**: contradicts the guide or weakens the work, but is not
losing a visitor today. **Low**: hygiene, dead code, latent risk.

The blunt version, before the detail: **this is a beautifully built
agency portfolio with an IELTS teacher's words pasted into it.** The
typography, the motion and the restraint are genuinely good — better
than almost anything in this market. But the site is monolingual English
for a Persian-speaking audience, contains not one piece of evidence that
Shabnam can raise a band score, and asks a stranger for their email
address before it has told them anything true about her. The craft is in
the wrong places.

---

## 1. Design tokens actually in use

### What exists

Colour is the one layer that is genuinely systematised.
`app/globals.css:8-127` declares the full brand palette — all four core
values and all five p.9 additions — at the right names, with the
reasoning written beside them. Not one raw brand hex appears in a
component: the only literal hex values in `.tsx` are Google's four
brand colours inside `components/GoogleMark.tsx:30-42`, which is
correct, because Google's mark is Google's. **Colour is not the
problem on this site.** Skip to 1.2.

### 1.1 There is no spacing scale — High
**Violates:** systematic rhythm; a token that exists only as a repeated
literal is not a token.

`app/globals.css:353` defines `.page-margin` as a hardcoded 15px and
`.page-grid` at `globals.css:358-366` a hardcoded 15px gutter. Every
other measurement in the site is an arbitrary Tailwind value written
inline. Counted across `app/` and `components/`:

```
16 × px-[15px]     7 × gap-y-[50px]    5 × pb-[200px]
 5 × pb-[100px]    5 × gap-y-[30px]    5 × gap-y-[200px]
 5 × gap-y-[100px] 3 × py-[100px]      2 × py-[200px]
 2 × py-[120px]    2 × gap-y-[60px]    1 × py-[140px]
 1 × py-[60px]     1 × pt-[76px]       1 × pt-[24px]
```

Three consequences, in order of how much they cost:

1. **The section rhythm is inconsistent and it is visible.** `Services`
   breathes at `py-[100px] md:py-[200px]`
   (`components/Services.tsx:10`); `Quote` immediately below it at
   `py-[60px] md:py-[100px]` (`components/Quote.tsx:16`). Two adjacent
   sections on the home page pace at half each other's rate, for no
   stated reason. The reader feels the page speed up without knowing
   why.
2. **120px and 140px and 76px and 24px are one-offs** —
   `py-[120px]`, `py-[140px]`, `pt-[76px]`, `pt-[24px]` each appear
   once or twice. They are not part of any sequence. Somebody nudged a
   number until it looked right and left it there.
3. Changing the page margin means editing 16 call sites. There is no
   `--space-*` anywhere in `globals.css`.

The values themselves are nearly a scale already — 15 / 30 / 50 / 60 /
100 / 200 — which is what makes this worth fixing rather than
tolerating. Six tokens would absorb all of it.

### 1.2 `--color-confirm` is used as a marketing colour on three pages — High
**Violates:** brand guide p.9, verbatim: *"#3F6B54 Confirm — Form
success only. Never marketing."* Also p.9's governing sentence: *"the
accent appears mainly in motion… do not dilute it by adding brand
colours to public surfaces."*

The guide could not have been more explicit, and the site does it
anyway — in headings, at display size, on public marketing pages:

- `app/(site)/about/page.tsx:70` — `text-h2 text-confirm`, a section
  heading on the About page
- `app/(site)/about/page.tsx:85` — same, second heading
- `app/(site)/learn/[slug]/[item]/page.tsx:150` — `text-h1
  text-confirm`, the **hero** of a lesson page, i.e. the single largest
  element on the screen, in the form-success green
- `app/(site)/learn/[slug]/[item]/page.tsx:178`, `:274`, `:280`,
  `:287`, `:115`, `:140` — six more on that one page
- `components/FooterWordmark.tsx:50` — `text-confirm` on the
  full-bleed wordmark, i.e. **on every page in the site**

This is the exact failure mode the guide names: a colour reserved for
one signal gets spent on decoration, and then it can no longer signal.
By the time a student submits a form, green means "heading". The site
has quietly reassigned its confirmation colour to branding, which is
the one job the guide forbids it.

Note that this is *also* the site's only real colour, and it is
carrying the About page — so the fix is not "delete the green", it is
"decide what the second colour is and write it into the guide". Right
now the code has made that decision unilaterally.

### 1.3 There is a middle sans, and the guide bans it by name — Medium
**Violates:** brand guide p.10, THE GOVERNING RULE: *"The leap between
display and body is deliberately violent. There is no comfortable
middle sans, and there must not be one… A mid-weight sans at a middle
size is the safest thing a designer can reach for — and exactly what
would drain this identity of its confidence."*

`app/globals.css:333-343`:

```css
.text-body-h2 { font-family: var(--font-psr), serif; font-size: calc(1.75em + 1.4vw); }
@media (min-width: 1024px) {
  .text-body-h2 { font-family: var(--font-nhm), sans-serif; font-size: 21px; }
}
```

Below 1024px it is the serif, correctly. At desktop it becomes
Instrument Sans at 21px — a mid-weight sans at a middle size, the
literal thing the rule prohibits, and it only appears on the widest
screens where the violence of the leap matters most.

Mitigating and worth knowing: **`.text-body-h2` is dead.** It is
declared at `globals.css:333` and referenced from no `.tsx` file in the
repo. So it costs nothing on screen today. It is a loaded gun in the
stylesheet — the next person who needs a subheading will find it,
reach for it, and the rule breaks silently. Delete it or make it the
serif at all widths.

### 1.4 The type scale is six unrelated formulas, not a scale — Medium
**Violates:** modular scale; ratios that can be reasoned about.

| Class | Size | Family | Used |
|---|---|---|---|
| `.text-h1` `globals.css:218` | `calc(0.75em + 12vw)`, capped 3 ways | Kumbh 700 | yes |
| `.text-h1-2` `globals.css:289` | `12vw` | Kumbh 700 | yes |
| `.text-menu` `globals.css:293` | `calc(2.5em + 6vw)` | Kumbh 700 | yes |
| `.text-h2` `globals.css:311` | `calc(2.5em + 2vw)` | Instrument Serif | yes |
| `.text-h3` `globals.css:316` | `calc(1.25em + 1vw)` | Instrument Serif | once, `LegalPage.tsx:46` |
| `.text-body-h2` `globals.css:333` | `calc(1.75em + 1.4vw)` → 21px | serif → **sans** | **never** |
| `.text-note` `globals.css:321` | 16px → 21px @768 | Newsreader 300 | yes |
| `.text-body` `globals.css:345` | 16px | Instrument Sans | yes |

There is no ratio connecting these. `0.75em+12vw`, `2.5em+6vw`,
`2.5em+2vw`, `1.25em+1vw`, `1.75em+1.4vw` — five different em bases and
five different viewport coefficients, so the relationship between any
two headings changes continuously as the window resizes. At one width
`.text-h2` and `.text-h3` are a fifth apart; at another they are nearly
touching. This is why hierarchy on the inner pages reads as unstable
(see §2).

Two of the eight classes are effectively dead (`.text-body-h2` never,
`.text-h3` once). An eight-step scale where two steps are unused and
five bases disagree is not a system; it is an accumulation.

### 1.5 Five radii, none tokenised, on a site whose identity is square — Medium
**Violates:** form language consistency; brand guide p.11-12
composition rules (*"Half very tight, half very wide. Nothing in
between"* — a hard-edged, architectural sensibility).

Every radius in the codebase, and there is no token for any of them:

- `1.5rem` — `app/globals.css:632`
- `1rem` — `app/globals.css:695`
- `rounded-[14px]` — `components/AuthSignUp.tsx:78`
- `rounded-md` (6px) — `components/BackControl.tsx:209`
- `rounded-full` — `components/AuthSignUp.tsx:350,454`,
  `components/CustomCursor.tsx:80,84`, `components/chat/Assistant.tsx:545,643,660`

The marketing surface — hero, Services, Quote, Footer, every image —
is 100% square-cornered, and that squareness is a large part of why the
site reads as editorial rather than as a startup. Then the two
surfaces a visitor must actually *use* to become a customer — the
sign-up panel and the assistant — are built from 14px cards and
`rounded-full` pills. Those are SaaS shapes. The exact moment the site
asks for commitment is the moment it stops looking like itself and
starts looking like every other product page. See §6.

`rounded-full` on the cursor (`CustomCursor.tsx:80,84`) is correct and
excluded from this criticism — a dot and a ring are circles.

### 1.6 Shadow: nothing to report — none used
Zero `box-shadow` and zero `shadow-*` utilities in the entire
`app/` and `components/` tree. On a flat monochrome paper-and-ink
identity that is the right answer, arrived at deliberately or not. The
only depth cues are `backdrop-blur-[5px]` on the two glass panels.
Leave it alone.

### 1.7 Font variable names lie about what they load — Low
**Violates:** maintainability; the guide's own p.10 licence table is now
out of date because of it.

`app/layout.tsx:47` loads Google's **Instrument Sans** into a variable
called `--font-nhm` — "nhm" being Neue Haas / Neue Montreal, the
unlicensed self-hosted face the brand guide p.10 flags as *"no licence
trail… a real exposure on the day the site sells a service."* Same for
`--font-psl` / `--font-psr` at `layout.tsx:30,39`, which now hold
Instrument Serif and Newsreader.

The good news is that **the p.10 licence exposure is resolved** —
`public/fonts/` no longer exists, the three obfuscated files are gone,
and every face is now Google Fonts / SIL OFL. The bad news is that
nothing in the repo or the guide records that, and the variable names
actively suggest otherwise. Someone auditing licences from the guide
will go looking for a problem that was already fixed; someone auditing
from the code will think Neue Haas is loaded. Rename to
`--font-serif-lg` / `--font-serif-sm` / `--font-sans`, or at minimum
correct p.10.

Related, `app/globals.css:206-208` carries a stale comment: *"more than
one Kumbh weight is loaded, so leaving this to the default would
resolve to the light face."* `layout.tsx:13-17` loads
`weight: "700"` only. The comment describes a state that no longer
exists.

### 1.8 A sixth font family, outside the system — Low
`app/layout.tsx:23-27` loads **Inter** as `--font-grotesk` for the
kinetic category tiles, used at `globals.css:471-476`. The brand guide's
type system (p.10) has exactly three Latin layers and Inter is in none
of them. The justification in the comment is honest — Kumbh does not
cover the neo-grotesque look the motion reference wants — but the
result is that the three tiles on the home page, which are among the
loudest things on it, are set in a face that appears nowhere in the
brand. Either write Inter into the guide as a fourth, motion-only
layer, or set the tiles in Kumbh and lose the reference.

---

## 2. Typographic hierarchy, page by page

### The structural finding first

Every marketing page is built from the same three-step ladder and
nothing else:

1. `.hero-stack` + `.text-h1` — a full viewport of Kumbh 700 at
   ~12vw, uppercase, `line-height: 0.78` (`globals.css:204-287`)
2. `.text-h2` — Instrument Serif at `calc(2.5em + 2vw)`
   (`globals.css:311-314`)
3. `.text-note` / body — 16-21px (`globals.css:321-350`)

There is no fourth step. `.text-h3` is used exactly once, in
`components/LegalPage.tsx:46`. So the gap between step 2 and step 3 is
roughly 4:1 with nothing in it, which is *deliberate and correct* per
the guide's "violent leap" rule — but the guide puts the serif in that
gap, and the serif is being spent on step 2 instead. The consequence
shows up below.

### 2.1 Home page — focal point exists, but it is spent on the logo, not the argument — High
**Violates:** hierarchy should rank by importance, not by decoration.
Brand guide p.14: *"Homepage → Warm & Committed."*

Three full-viewport-scale type events compete on one page:

| Element | Size | File |
|---|---|---|
| `Your ( ✳ ) goal speaks English` | `.text-h1`, ~12vw × 5 lines, 100svh | `components/Hero.tsx:17-68` |
| `For IELTS Blogcasts and Business English` | `.text-h1-2`, **12vw** | `components/Services.tsx:12-97` |
| `ielts.` | **`text-[48vw]`** serif italic | `components/FooterWordmark.tsx:65` |

`.text-h1-2` at `globals.css:289-291` is `12vw` flat, which at most
widths renders **larger** than `.text-h1`'s
`calc(0.75em + 12vw)` capped by `min()` against viewport height
(`globals.css:278-287`). On a laptop the Services block is physically
bigger than the hero. So the page's loudest moment is a list of three
product names, not the promise.

And the single largest element on the entire site, on every page, is
`ielts.` at 48vw — a generic exam name, set in the form-success green,
functioning as a back-to-top button. It is bigger than Shabnam's name
has ever been rendered anywhere. The brand guide's whole positioning
argument (p.4) is that *"an IELTS teacher"* is a category containing
thousands of people and that the brand's job is to escape it. The
biggest word on the site puts her back inside it.

The guide also assigns the logo a strapline — the tagline (p.5) and
*"Explained in Persian. Judged by the English standard."* (p.17). The
wordmark at `FooterWordmark.tsx:43-51` carries neither. It is a word at
48vw with nothing attached.

**One clear focal point per screen? Yes — three times, at three
different scroll positions, and none of them makes a claim.**

### 2.2 About page — three headings of identical rank, coloured arbitrarily — Medium
**Violates:** visual weight must encode real difference.

`app/(site)/about/page.tsx` sets three `<h2>`s at identical
`.text-h2` size:

- `:70` — "I know what it feels like to be judged on a language that isn't yours." — `text-confirm` (green)
- `:85` — "I find what's actually costing you marks, adapt fast, and stay until it's fixed." — `text-confirm` (green)
- `:103` — "A normal day: marking, correcting, and staying a little longer than planned." — **ink**

Two are green and one is ink. Nothing in the content justifies the
split: the third is not more or less important than the first two, it
is simply the one that has photographs under it. A reader decoding the
page will conclude the ink heading means something different from the
green ones, and be wrong. Either all three are peers and take one
colour, or one of them is the page's argument and gets promoted — and
if you are promoting one it should be `:85`, which is the only line on
the page that describes what she actually does.

The hero — `I am ( ✳ ) Shabnam Ahari`, four lines of `.text-h1`
(`about/page.tsx:26-66`) — spends an entire viewport on a name. On the
About page that is defensible. It is also where the guide's approved
About-page line lives: *"I read your writing the way an examiner does
— in four minutes, hunting for reasons to deduct."* (p.17, placement
given explicitly as **About page**). That line does not appear anywhere
in the repository. It is a stronger opening than the name and it was
written for this exact slot.

### 2.3 Learn index — the heading and the hero say the same thing twice — Low
`app/(site)/learn/page.tsx:45-100` gives a full viewport to
`This is / What / ( ✳ ) / You / Learn`, then
`:104-107` follows immediately with the `.text-h2`
*"Everyone starts on the same foundation. Nobody finishes on the same
plan."*

The `.text-h2` is by far the better line — it is one of the six
approved supporting lines (p.17), placed exactly where the guide says
to put it. The hero above it is five words of navigation label set at
the largest type on the page. The hierarchy is inverted: the throwaway
is enormous and the argument is a quarter of the size.

### 2.4 Category page — the description is doing the hero's job — Medium
`app/(site)/learn/[slug]/page.tsx:69-96` gives the hero to
`( showreel ) + Ielts` — a media slot and a one-word product name.
Then `:101-103` sets `project.description` at `.text-h2`, and for
`ielts` that string (`lib/projects.ts:66`) is:

> "Most preparation starts with a syllabus. Yours starts with a
> diagnosis. Half a band is a whole life — a visa, an admission, a
> career — and I build the plan that closes that exact gap."

**That is the best copy on the entire website.** It carries the
positioning statement (p.4), the approved headline *"Half a band is a
whole life"* (p.17), and the approved word *diagnosis* (p.18). It is
the only place in the whole repo where the words *diagnosis* or *half a
band* appear.

It is two clicks from the home page, set at a quarter of the size of
the word `Ielts` above it, and reachable only by a visitor who has
already decided to trust her. The single strongest sentence she owns is
buried behind the weakest hierarchy decision on the site.

### 2.5 Lesson page — the hero is `( in production )` — High
**Violates:** the deepest page must reward the click.

`app/(site)/learn/[slug]/[item]/page.tsx:136-227` is the leaf of every
navigation path. Its hierarchy is well built — hero photograph, title
at `.text-h1-2`, roles at `.text-note`, then the CTA. Its content is:

- `:224-226` — `( in production )`, on **every one of the eighteen
  panels**
- `:274-283` — the only call to action on the page: **"Set Up Your
  Account"**

A visitor who navigates Home → Learn → Ielts → Placement Assessment —
four clicks, which is a genuinely interested person — arrives at a
photograph, a title, the words "in production", and a request to create
an account. Nothing has been taught, proven or offered. The hierarchy
is pointing hard at a sign-up form for a product that the same page
says does not exist yet.

The comment at `:126-133` is worth reading for a different reason: it
sizes the title against *"Healthcare"* and *"Engineering &
Construction"* — sector names from the agency template this was built
from, still governing the type size of Shabnam's lesson titles. See §6.

### 2.6 `/auth` — a page with no hierarchy at all — Medium
`app/(site)/auth/page.tsx:24-45` renders `<AuthPanels />` centred on
Media Gray and nothing else. No heading, no h1, no sentence explaining
what an account is for. The `<title>` says "Set Up Your Account"
(`:5`); the page itself never says it.

The panel copy (`components/AuthSignUp.tsx:607`) reads *"Sign in, or
create an account"* at panel-bar size. That is the largest text on the
page. A page whose sole purpose is to convert has no heading and no
argument — the strongest typographic element on it is a form label.

---

## 3. Trust signals — what proves in five seconds that you can raise a band score

### The five-second answer: nothing. Not one thing.

I went through the home page as a first-time visitor would, in order,
and recorded what is on screen.

| Second | What is visible | What it proves |
|---|---|---|
| 0-1 | `Your ( ▨ ) goal speaks English` — five lines of Kumbh, plus a grey box labelled **SHOWREEL** where the video should be | Nothing. No name, no face, no subject. |
| 1-2 | Top-right: the word `Menu`. Top-centre: the assistant bar, `ask me`. | Nothing. Her name appears nowhere above the fold. |
| 2-4 | Scrolling: a full-width 16:9 **grey rectangle** grows out of the bottom of the viewport | Nothing. It is empty. |
| 4-6 | `For IELTS Blogcasts and Business English` at 12vw | Subject matter, finally. Not competence. |

**A visitor five seconds in does not know her name, has not seen her
face, and has read no claim they could believe or disbelieve.** They
have seen two empty grey placeholder boxes, and a third is waiting
inside the menu.

### 3.1 The three centrepiece media slots are empty placeholders — High
**Violates:** a hero must carry the argument; brand guide p.11-12
(photography is a governing part of the identity).

- `components/Hero.tsx:9` — `const HERO_VIDEO: string | undefined = undefined;`
- `app/(site)/page.tsx:12` — `<HeroVideoReveal />`, with no `src` prop
- `components/MenuOverlay.tsx:134` — `<VideoSlot label="Showreel" />`, no `src`, sitting in the middle of the navigation overlay

All three fall through to `components/VideoSlot.tsx:30-38`, which renders a
`bg-media-gray` box with the word **SHOWREEL** in 10px uppercase at 40%
opacity. `public/videos/` does not exist.

So the parenthesis in the middle of the tagline — the site's signature
gesture, the thing every `( … )` on the site is a rhyme for — is a
grey rectangle. And the `HeroVideoReveal` mechanism
(`components/HeroVideoReveal.tsx:12-60`), which is genuinely clever
scroll choreography, exists solely to grow an empty grey box to
full-bleed 16:9 as you scroll. The best-engineered motion on the site
is spent revealing nothing.

And the third one is in the menu: opening the navigation shows an empty
grey box between "Learn" and "About", framed in the site's own
parentheses as though it were the menu's featured content.

This is the single highest-value fix available. One 20-second clip of
her marking a paper, in that slot, does more for conversion than every
other item in this document.

### 3.2 The five "work samples" are stock photos of nothing — High
**Violates:** brand guide p.12, NEVER list: *"Stock photography."*
Brand guide p.11: every image must survive greyscale and reward the
hover.

`components/Quote.tsx:6-12,33-40` renders five thumbnails from
`https://picsum.photos/seed/adcker-thumb-N/600/450`, with
`alt="Work sample {num}"` and the caption `( 01 )` … `( 05 )`.

These are random images from a public placeholder service. They are not
Shabnam's, they are not IELTS, they are not photographs of work, and
they are labelled *work samples*. They also fail to load intermittently
— `unoptimized` at `:38` means they are fetched live from picsum on
every render, and `next.config.ts` is trusting a third-party host in
production.

Directly under the site's strongest sentence — the USP at
`Quote.tsx:19-21`, which is the p.8 line verbatim and is genuinely
excellent — sit five pieces of stock photography captioned as evidence.
The guide's photography brief (p.12) names exactly what should be
there: *"A marked-up essay with dense margin annotations, a printed
score report, a band descriptor sheet, a screen showing a correction in
progress… An empty laptop says nothing about this brand. A page covered
in marking says everything."*

She has three real photographs of herself in `public/images/about/` and
they are used on one page.

### 3.3 There is no credential, no method, and no result anywhere on the site — High
**Violates:** brand guide p.13, trait 03: *"Authority comes from
method."*

Searched across `app/`, `components/`, `lib/` and `content/`. The
marketing site contains:

- **Zero** teaching qualifications, years of experience, or examiner
  training
- **Zero** student outcomes of any kind
- **Zero** testimonials or named students
- **Zero** sample corrections, marked scripts, or score reports
- **One** mention of the word *diagnosis* — `lib/projects.ts:66`, two
  clicks deep
- **Zero** mentions of *band descriptors* — the phrase the positioning
  statement (p.4) says *every judgment traces back to*, and which is on
  the approved-words list (p.18)

The guide's ban on unvalidated numbers (p.18, BAN ONE) is being
honoured — correctly, and I would not change that. But the guide's
answer to having no numbers yet is explicit: *authority is carried by
method until the intake log has produced a real number.* The site
carries neither. It banned the statistics and then never wrote the
method.

The method exists. It is written, in her voice, and it is good — it is
sitting in `content/kb/how-it-works.en.md`:

> "Nobody starts at lesson one. Everything starts with a reading of
> where you are — which criterion is costing you marks, in which
> section, and by how much."

That paragraph answers the five-second question better than anything
currently rendered. **It is only reachable by opening a chatbot and
asking the right question.** Nine knowledge-base documents in
`content/kb/` — the method, the sessions, the timeline, the pricing
policy — are invisible to anyone who does not talk to a bot.

### 3.4 The approved proof lines were written and never used — Medium
**Violates:** brand guide p.17, which gives each line a named
placement.

Of the six approved supporting lines, **one** appears on the site:

| Line | Guide's placement | In the code? |
|---|---|---|
| "Everyone starts on the same foundation. Nobody finishes on the same plan." | Services page | ✅ `learn/page.tsx:105` |
| "I read your writing the way an examiner does — in four minutes, hunting for reasons to deduct." | **About page** | ❌ nowhere |
| "If ten sessions get you to 7, I won't sell you twenty." | Pricing page | ❌ nowhere |
| "If your score doesn't move, the problem is my method — not your talent." | "Why me" section | ❌ nowhere |
| "Books and AI can carry you through Reading and Listening. Speaking and Writing need a human examiner's eye." | Instagram bio · category explanation | ❌ nowhere |
| "Explained in Persian. Judged by the English standard." | **Logo strapline** | ❌ nowhere |

And of the four headline-bank headlines (p.17), one appears — *"Half a
band is a whole life"*, inside `lib/projects.ts:66`. *"You don't have
time to guess"*, *"Your English is better than your score"* and
*"Practice makes permanent"* appear nowhere.

Three of the missing lines are the strongest proof assets she owns.
"I read your writing the way an examiner does — in four minutes,
hunting for reasons to deduct" is a five-second trust signal in one
sentence: it is specific, it is a demonstration rather than a claim,
and it tells a sceptical buyer exactly what they are getting. The guide
even tells you which page to put it on. There is a heading slot waiting
for it at `app/(site)/about/page.tsx:70`.

There is no "Why me" section and no pricing page anywhere in the route
tree, so two of the lines have nowhere to go — which is itself the
finding: the guide assumes pages that were never built.

### 3.5 No structured data, no verifiable identity — Low
No `schema.org` JSON-LD anywhere — no `Person`, no `Course`, no
`EducationalOrganization`. `app/layout.tsx:96-121` sets title,
description and OG image and stops there. For a personal brand whose
entire proposition is *trust this individual*, a `Person` block with
`jobTitle`, `knowsLanguage` and `sameAs` (the LinkedIn URL already in
`components/Footer.tsx:26-27`) is close to free and is what search
results use to show a person as a person.

---

## 4. Conversion path — landing to Telegram

### The path, measured

`https://t.me/SHABNAMAHARI` is defined once, correctly, at
`components/Footer.tsx:22`. It is reachable from the marketing site by
exactly two routes:

1. **Footer CTA** — `components/Footer.tsx:75-82`: *"If you have a
   target score and a date, start here →"*
2. **Footer "( Reach out )" list** — `Footer.tsx:24-35,105-121`: a
   plain 16px link labelled `Telegram`, beside `LinkedIn`

Both are in the footer. Both are 16px `body-link` text.

### 4.1 There is no call to action above the fold, or in the first three screens — High
**Violates:** conversion path must exist before the argument ends.

Home page render order (`app/(site)/page.tsx:9-15`):

```
Hero            → 100svh, no CTA
HeroVideoReveal → up to a further 16:9 viewport, empty grey, no CTA
Services        → py-[200px], three product names, no CTA
Quote           → the USP + 5 stock photos + "More about me" → /about
Footer          → AuthSignUp, then the Telegram link
```

A desktop visitor scrolls roughly **four viewport heights** before the
first opportunity to contact her. The one link before the footer —
`Quote.tsx:24-26`, *"More about me"* — routes to `/about`, which is a
page with **no Telegram link and no CTA of any kind** except its own
footer. Every path leads to the same footer.

The header (`components/Header.tsx:30-59`) contains one word: `Menu`.
No name, no contact, no CTA, ever, on any page.

### 4.2 The primary CTA is a 16px underlined sentence in a footer — High
**Violates:** the most important action should be the most prominent
element in its region.

`components/Footer.tsx:75-82`:

```jsx
<a href={SHABNAM_TELEGRAM} className="body-link" target="_blank" rel="noreferrer">
  If you have a target score and a date, start here →
</a>
```

`.body-link` (`globals.css:379-397`) is 16px Instrument Sans with a 1px
underline. In the same footer, on the same page:

- `AuthSignUp` renders a full-width red glass panel stack
  (`components/AuthSignUp.tsx:78`, `--auth-fill` at
  `globals.css:118`) — Signal Red at 95% opacity
- `FooterWordmark` renders `ielts.` at **48vw** in green
  (`FooterWordmark.tsx:65`)

So in the footer, the ranking by visual weight is: (1) a six-letter
back-to-top button, (2) an email capture form, (3) the actual way to
reach a human being. The thing the business runs on is third.

The copy itself is excellent — it is the guide's own CTA construction
(p.16: *"The CTA is a question, not an offer… two facts is lower
friction"*). It is set at the size of a legal disclaimer.

### 4.3 Two competing conversion mechanisms, and the wrong one is louder — High
**Violates:** one primary action per screen; brand guide p.16, which
sets the CTA as the diagnosis question.

The home page footer asks for two different things within about 200px
of each other:

- `AuthSignUp` (`Footer.tsx:52`) — name, email, and a six-digit code,
  or Google OAuth. Loud, red, glass, full width.
- The Telegram link — quiet, 16px.

The account leads to `/myaccount`, which per the repo's own notes shows
placeholder courses. So the loud ask is: *give me your email address so
you can log in and see nothing.* The quiet ask is: *tell me your target
score and I'll tell you honestly what stands between them* — the
product, performed.

This inverts the guide's stated reasoning at p.16 exactly: *"'Book a
free session' asks for a commitment before any value has been shown."*
An email address and a verification code is a **larger** commitment
than booking a session, asked earlier, with less value shown.

The same inversion is at the leaf of every navigation path: the only
CTA on a lesson page is `Set Up Your Account`
(`learn/[slug]/[item]/page.tsx:274-283`), set at `.text-h2` in green —
on a page that says `( in production )` twenty lines above it.

### 4.4 Nothing tells the visitor what happens when they press it — Medium
**Violates:** reduce uncertainty at the point of commitment.

`Footer.tsx:75-82` opens `t.me/SHABNAMAHARI` in a new tab. Before
pressing, the visitor does not know: that it is Telegram, that it
reaches Shabnam personally rather than a bot, that it is free, or that
it is not a booking. The word "Telegram" appears only in the separate
"( Reach out )" list.

This matters more than usual for this audience. A Persian speaker
inside Iran needs to know whether this requires a VPN before they
commit to a tab that may hang. See §8.

There is also a live confusion risk the code is aware of and the
interface is not: `t.me/SHABNAMAHARI` (Shabnam) and `t.me/SirCue_bot`
(the assistant, `components/chat/Assistant.tsx:79`) are both linked from
the same pages. `Footer.tsx:15-21` and `Assistant.tsx:71-78` both carry
careful comments explaining that these must never be confused. Neither
link tells the user which is which. The bot's is labelled *"Also on
Telegram"*; Shabnam's is labelled *"Telegram"*.

### 4.5 The assistant is the best conversion surface and it is unlabelled — Medium
The one thing on this site that is available above the fold, on every
page, in both languages, is the assistant bar — and it says `ask me`
(`components/chat/Assistant.tsx:17`). It knows the method, it has the
pricing policy, it speaks Persian, and it can hand off. It is the
fastest route from stranger to conversation that exists here.

It is a two-word lowercase label in a top bar with no visual priority,
mounted at `app/(site)/layout.tsx:53` outside the chrome. Most visitors
will read it as a chat widget and ignore it, because that is what
two-word chat bars are. The three opening topics
(`Assistant.tsx:53-67`) are *Registration*, *Course details*, *Payment
& fees* — three administrative questions, none of which is the question
a sceptical buyer actually has, which is *can you get me from 6 to 7 by
March.*

---

## 5. Whitespace, section pacing, mobile

### What is right

The whitespace strategy is the strongest thing on this site and it
should not be touched. 100svh heroes, `py-[200px]` between desktop
sections, `line-height: 0.78` on display type, empty space genuinely
left empty — this is the guide's p.12 composition rule (*"Let the
subject run off the edge. Leave empty space empty"*) applied properly,
and it is why the site reads as expensive. Everything below is a defect
inside a good system, not an argument against the system.

### 5.1 The mobile site loses every piece of connective language — High
**Violates:** progressive enhancement; content that carries meaning must
not be decoration-classed.

Thirteen of the fourteen `max-md:hidden` / `max-lg:hidden` in the
codebase hide the same thing: the `.text-note` annotations. On a phone,
all of these disappear:

| Hidden on mobile | File |
|---|---|
| "You will reach your" | `components/Hero.tsx:43` |
| "Showreel" | `components/Hero.tsx:35` |
| "Our services" | `components/Services.tsx:16` |
| **"Click me" ×3** | `components/Services.tsx:40,55,99` |
| "The minds behind" | `app/(site)/about/page.tsx:50` |
| "Find your fit" | `app/(site)/learn/page.tsx:84` |
| "Showreel" | `app/(site)/learn/[slug]/page.tsx:83` |
| "# 01" | `app/(site)/learn/[slug]/[item]/page.tsx:162` |
| the sibling-programme row | `learn/[slug]/[item]/page.tsx:299` |
| all four menu notes | `components/MenuOverlay.tsx:63` |

Two of these are not decoration.

**"You will reach your"** (`Hero.tsx:46`) is the only sentence in the
hero that makes a promise. Without it the mobile hero is
`Your ( ▨ ) goal speaks English` — the tagline alone, over an empty
grey box. Every mobile visitor gets the weaker version of the home page,
and mobile is the majority of this audience.

**"Click me" ×3** (`Services.tsx:44,58,102`) is the *only* affordance
telling anyone the three kinetic tiles are links. On desktop it appears
beside them; on mobile it is hidden. And on mobile there is no hover,
so `@media (hover: none)` at `globals.css:545-549` sets the tiles
animating permanently — which makes them read as autoplaying decoration
rather than as buttons. A mobile visitor is shown three animated black
squares that are silently the primary navigation into the product
pages, with no label, no cursor change and no hover state.

The pattern is understandable — these are marginal annotations and
margins do not exist at 375px. The fix is not to unhide them in place;
it is to promote the two that carry meaning into the flow.

### 5.2 The greyscale-to-colour system does not exist on mobile — High
**Violates:** brand guide p.11, verbatim: *"Every image therefore has
two states, and both are seen by every visitor."*

`globals.css:431-439`:

```css
.media-grayscale { filter: grayscale(1); transition: filter 0.7s …; }
.media-grayscale:hover { filter: grayscale(0); }
```

`:hover` only. On a touch device it never fires. So on a phone **every
photograph on the site is permanently greyscale** — the About
portraits, the lesson heroes, the category panels, all of it.

This is not a small styling gap. The photography brief on p.11-12 is
built entirely on the two-state mechanic: hard directional light so
greyscale survives, saturated colour so *"the reveal is worth the
hover"*, one cool wardrobe note that *"is what wakes up"*, no red in
frame because the cursor floats above. Every one of those four rules
exists to serve an interaction that a majority of this audience will
never trigger. Mobile visitors see only the deliberately-drained half
of a system whose whole argument is that both halves get seen.

Either the mobile state needs its own trigger (in-view, tap, or simply
colour-by-default under `hover: none`), or p.11 needs rewriting to say
that colour is a desktop reward. Right now the code and the guide
disagree and the code is losing.

### 5.3 Adjacent sections pace at different rates on the same page — Medium
**Violates:** consistent rhythm; see §1.1.

On the home page, in scroll order:

| Section | Vertical padding | File |
|---|---|---|
| `Services` | `py-[100px] md:py-[200px]` | `components/Services.tsx:10` |
| `Quote` | `py-[60px] md:py-[100px]` | `components/Quote.tsx:16` |
| `Footer` block | `py-[100px] md:py-[200px]` | `components/Footer.tsx:53` |

The middle section breathes at half the rate of the two either side of
it, and `Quote` is the one holding the USP — the most important
sentence on the page. It gets the least air. Meanwhile the About page
runs `gap-y-[100px] md:gap-y-[200px]` uniformly
(`about/page.tsx:25`), and the Learn page the same
(`learn/page.tsx:43`) — so the rhythm is consistent everywhere except
the home page, which is the page that matters.

### 5.4 A 15px page margin on a 1920px display — Medium
**Violates:** measure and margin should scale with the viewport.

`.page-margin` is `padding-left: 15px; padding-right: 15px`
(`globals.css:353-356`), with no breakpoint. `.page-grid`'s column gap
is 15px above 768px and **zero below it**
(`globals.css:358-366`) — so on a phone, adjacent grid columns touch.

15px is a phone margin used as a desktop margin. The display type
carries it (running to the edge is the point), but the body copy does
not: `about/page.tsx:74` sets `max-w-3xl` inside `col-span-10
col-start-2`, so the paragraph is constrained by its own max-width
rather than by the page, and the 15px is doing nothing except on
mobile. Where it does bite is the footer's `px-[15px]`
(`Footer.tsx:51`) and the 16 other call sites: on a wide monitor the
footer nav sits 15px from the glass.

### 5.5 The `min-h-[100svh]` hero on a lesson page has nothing in it — Low
`learn/[slug]/[item]/page.tsx:138` gives a full viewport to a
photograph, a title, an optional roles line and the words
`( in production )`. On a phone that is a full screen of scrolling
before any content. The hero cap machinery at `globals.css:244-287` is
carefully built to make five lines of display type fit a 640px window;
here it is reserving a whole viewport for four short elements.

### 5.6 The assistant is narrower than the page on a small phone — Low
`components/chat/Assistant.tsx:149` — `w-[clamp(20rem,34vw,40rem)]`.
The 20rem (320px) floor means that on a 320-375px device the panel is
either full-bleed with zero margin or wider than the 15px page margin
allows, so the one persistent UI element does not align with anything
else on the page. A `min(100% - 30px, …)` floor would land it on the
site's own margin.

---

## 6. What reads as a generic template rather than a brand

The site was built from **adcker.com**, a creative-agency portfolio,
with components lifted from **Skiper UI**. That is a legitimate way to
start and the port is skilful. The problem is that the port stopped at
the visuals: the *structure*, the *vocabulary* and the *content model*
of an agency portfolio are all still here, and they describe a business
Shabnam is not in.

`adcker` appears 15 times in the source, in three different kinds of
place — comments, class names, and **live data**.

### 6.1 The site still uses an agency's vocabulary for a teacher's work — High
**Violates:** brand guide p.3 (VOICE: *"'I' while this is a personal
brand"*), p.14 (*"Never `we` — this is an 'I' brand"*).

| On screen | File | Why it is wrong |
|---|---|---|
| **"Our services"** | `components/Services.tsx:19` | `we`, banned outright by p.14. It is also the agency's section name for a page selling three products. |
| **"More about our Programs"** | `app/(site)/about/page.tsx:95` | `our` again, on the page that is supposed to be most personal. |
| **"The minds behind"** | `app/(site)/about/page.tsx:51` | **Plural.** It sits directly beside a photograph of one woman, above her own name. This is a studio's About-page label on a solo personal brand — the exact institutional distance p.14 says the brand rejects. |
| **"Showreel"** ×3 | `Hero.tsx:36`, `HeroVideoReveal.tsx:59`, `learn/[slug]/page.tsx:84` | A showreel is what a director or an agency has. An IELTS teacher has a lesson, a correction, an explanation. |
| **"Work sample 01-05"** | `components/Quote.tsx:35` | Alt text describing stock photos as portfolio work. |
| **"Index"** | `components/Footer.tsx:10`, `MenuOverlay.tsx:84` | The agency-portfolio word for a home page. Its own menu note (`MenuOverlay.tsx:84`) has to translate it: *"Index / Home"*. If the label needs a gloss, use the gloss. |
| **"Other Programs you might be interested in"** | `learn/[slug]/page.tsx:118` | E-commerce cross-sell copy — "customers also viewed". |
| **`WorkEntry`**, `PROJECTS`, `galleryItems`, `reelImages` | `components/WorkEntry.tsx`, `lib/projects.ts` | The whole content model is *projects in a portfolio*. Her courses are typed as an agency's case studies. |

"Our services" and "The minds behind" are the two that a visitor
actually reads, and both directly contradict a rule the guide states
twice. `MenuOverlay.tsx:86` gets it right — the note under "About" is
*"Who I am"* — which shows the voice was understood and then not
carried through.

### 6.2 Live production data still points at the template — High
**Violates:** content integrity.

These are not comments. They are values the browser fetches:

- `components/Quote.tsx:7-11` — five `picsum.photos/seed/adcker-thumb-N` images, rendered on the home page
- `lib/projects.ts:64` — `cover: "https://picsum.photos/seed/adcker-toty/1454/816"`
- `lib/projects.ts:101` — `…/seed/adcker-pixi/…`
- `lib/projects.ts:137` — `…/seed/adcker-pacifica/…`

`toty`, `pixi` and `pacifica` are the original agency's client project
names, preserved as image seeds. Every one of these fetches a random
third-party photograph over the network at render time, and per the
project's own notes they intermittently fail to load. The home page of
a business that sells judgment and precision is showing images it did
not choose, from a server it does not control, named after somebody
else's clients.

`components/Footer.tsx:66-68` records that this same class of residue
was already found once and was worse: the site's only call to action
pointed at `hello@adcker.com` **on the published site**. Anyone who
pressed it wrote to nobody. That was caught. The image seeds were not.

### 6.3 The Business English taxonomy is a template's industry list — Medium
**Violates:** brand guide p.4 (*"Anything that does not begin with a
diagnosis falls outside the position"*), p.8 (*"One student, one
learning path"*).

`lib/projects.ts:140-174` defines six Business English "Areas":
Technology & IT, Business & Management, Sales & Marketing, Finance &
Accounting, Healthcare, Engineering & Construction — each with a
`roles` list ("Software Engineers, Developers, Product Managers, Data
Analysts").

This is the industry-vertical grid every B2B SaaS template ships with.
It is also, structurally, the opposite of the brand's position: six
pre-built content buckets sorted by job title is *a course sold as if
it were a plan* — the enemy named in bold on p.3. Nothing about the
list begins with a diagnosis; it begins with a category the visitor
self-selects into.

The residue is visible in the code as well as the concept:
`learn/[slug]/[item]/page.tsx:126-133` sizes the type on **every lesson
title on the site**, including all six IELTS programmes, against the
worst-case string *"Engineering & Construction"*. The template's
industry list is currently governing the typography of her IELTS pages.

### 6.4 The one saturated colour is spent on template chrome, not on the brand — Medium
**Violates:** brand guide p.9 (*"the accent appears mainly in
motion"*, *"Rare, so it carries meaning"*).

Signal Red `#FF3B30` appears in exactly two places on the marketing
site: the custom cursor (`components/CustomCursor.tsx:80-84`), which is
correct and is the guide's own example, and the sign-up panel fill
(`--auth-fill`, `globals.css:118`). The second one is a 95%-opaque
full-width red glass form.

The guide's word for the accent is *rare*. A form that occupies most of
a viewport is not rare, and the extensive comment at
`globals.css:76-117` concedes the cost in the code itself: white type
lands at **3.4:1** on it, below the 4.5:1 floor, and *"the cursor is
this same red and goes invisible over these panels."* So the brand's
one saturated colour is being used at a size that makes it furniture,
in a way that fails contrast, and it eats the cursor — the one element
the guide actually assigns that red to.

That is a deliberate, recorded decision of Shabnam's and I am not
relitigating it. But the effect is that the most branded colour on the
site now marks the most generic component on it: a sign-up form.

### 6.5 The visual signature is real, and it is the thing worth keeping — no action
For balance, because most of this section is negative. Four things here
are genuinely distinctive and would survive being lifted out of the
template entirely:

- The `( … )` parenthesis-as-media-frame (`components/ParenMedia.tsx:19-41`), used consistently for every clickable media object and echoed in `( Menu )`, `( Reach out )`, `( 01 )` and `( in production )`. This is a real mark.
- The kinetic type tiles (`globals.css:442-549`) — a word blooming past its own frame, with the loop reasoning written out at `:499-505`.
- The greyscale-until-hover photography, when it has real photographs to run on.
- The violent display/body leap, held to on every page.

None of that is templated. The problem is not that the site looks
generic — it does not. The problem is that a distinctive shell is
wrapped around an agency's information architecture and an agency's
words.

---

## 7. Bilingual readiness

`CLAUDE.md` states the audience is *"Persian speakers worldwide"* and
the rule *"Persian text must be RTL with a proper Persian webfont."*
The brand guide p.3 sets LANGUAGE as *"Bilingual — Persian for
explanation, English for the standard."*

### 7.1 The marketing site is monolingual English. There is no Persian on it at all — High
**Violates:** `CLAUDE.md` audience definition; brand guide p.3.

Every rendered string in `app/(site)/` and in every marketing component
is a hardcoded English literal. There is no `dir` attribute, no locale
routing, no `lang` switch, no translation layer, no message catalogue.
`app/layout.tsx:141` hardcodes `lang="en"` on `<html>` for the entire
application.

The full inventory of Persian on the public site: **the assistant
widget, and nothing else.** `components/chat/Assistant.tsx:80-108`
carries a proper `UI.en` / `UI.fa` pair with a language switch, and
`components/chat/mount.tsx:15-24` fetches a Persian greeting. The
copy in there is excellent — `Assistant.tsx:93` even documents why the
Persian title is *«از کجا شروع کنیم؟»* rather than a literal translation,
and `:97-100` explains the «شما»/«تو» choice from p.14 correctly.

So the one component built by someone thinking about Persian did it
properly, and the twelve pages around it are English-only. A Persian
speaker with weak English — which is, definitionally, the customer —
lands on a page they cannot read, whose sole Persian affordance is
hidden inside a chat bar labelled `ask me` in English.

This is the largest single gap between the stated brand and the built
site.

### 7.2 Hardcoded English strings, by component — High
Every one of these is a literal in JSX with no extraction point.
Non-exhaustive, ordered by how early a visitor meets it:

| String | File |
|---|---|
| `Your` / `goal` / `speaks` / `English`, `You will reach your`, `Showreel` | `components/Hero.tsx:20,46,50,59,65,36` |
| `Menu` / `Close` | `components/Header.tsx:18` |
| `For`, `Our services`, `Click me` ×3 | `components/Services.tsx:13,19,44,58,102` |
| the USP paragraph, `More about me` | `components/Quote.tsx:19-21,25` |
| `Index` / `Learn` / `About` / `Contact` + all four notes | `components/MenuOverlay.tsx:84-101`, `Footer.tsx:9-13` |
| `( Menu )`, `( Reach out )`, the closing paragraph, the Telegram CTA | `components/Footer.tsx:94,107,58-62,81` |
| `I am`, `Shabnam`, `Ahari`, `The minds behind`, all three h2s, both paragraphs, `More about our Programs` | `app/(site)/about/page.tsx:29,51,57,63,71,75,86,90,95,104` |
| `This is`, `What`, `You`, `Learn`, `Find your fit`, the foundation line | `app/(site)/learn/page.tsx:48,57,85,91,97,105` |
| every `name`, `description`, `galleryHeading`, `title`, `roles` | `lib/projects.ts:59-175` |
| `Other Programs you might be interested in` | `app/(site)/learn/[slug]/page.tsx:118` |
| `( in production )`, `Set Up Your Account`, `Other {heading} in` | `app/(site)/learn/[slug]/[item]/page.tsx:225,276,282,289` |
| `Sign in, or create an account`, `Email:`, `send code`, `By signing up, you agree to our…` | `components/AuthSignUp.tsx:607,422,456,491` |
| `Back` | `components/BackControl.tsx:209` |

`lib/projects.ts` is the one worth calling out structurally: it is the
site's content model, and its type (`lib/projects.ts:22-47`) has no
concept of a locale. Adding Persian later means changing the type,
which means touching every consumer. `content/kb/` already got this
right — nine documents, each in `.en.md` and `.fa.md` pairs. The
marketing content model did not learn from it.

### 7.3 Layouts that will break under RTL — High
**Violates:** `CLAUDE.md` (*"Persian text must be RTL"*).

Nothing in the site is written in logical properties. Everything is
physical `left` / `right`, so under `dir="rtl"` it will not mirror — it
will stay put while the text flips, which is worse than either.

**Directional positioning that will not mirror:**

- Every marginal `.text-note`: `absolute right-28 … translate-x-full` and `absolute left-0 … -translate-x-full` — `Hero.tsx:35,43`, `Services.tsx:16,40,55,99`, `about/page.tsx:50`, `learn/page.tsx:84`, `learn/[slug]/page.tsx:83`, `learn/[slug]/[item]/page.tsx:162`, `MenuOverlay.tsx:63,135`
- The Asterisk, hard-pinned left on every hero: `absolute left-16 md:left-24 -translate-x-full` — `Hero.tsx:25`, `about/page.tsx:34`, `learn/page.tsx:62`, `learn/[slug]/page.tsx:71`, `learn/[slug]/[item]/page.tsx:140`
- `WorkEntry.tsx:31,35,46` — `-left-[16vw]`, `-left-[8vw]`, `-right-[8vw]`, with four separate breakpoint overrides each
- `Header.tsx:30` — `justify-end` puts Menu top-right; in RTL the reading eye starts there, so the menu lands where the logo should be
- `globals.css:386-393` — `.body-link::after` at `left: 0`
- `globals.css:606-666` — `.hover-expand-row` is an explicit three-column grid with `grid-column: 2` for the panel and `grid-column: 3` for the title; `globals.css:686-696` reassigns them to 1 and 2 on mobile. Column *numbers* do not flip with direction.
- `globals.css:203-216` — `.text-h1` uses `padding-left`/`padding-right`, not `padding-inline`
- `components/FooterWordmark.tsx:50,65` — `-mx-[15px]`, and the letters are individual flex items in fixed order; `LETTERS` at `:5` is a hardcoded LTR array

**Typographic rules that are wrong for Persian even before layout:**

- `.text-h1`, `.text-h1-2`, `.text-menu` all set `text-transform: uppercase` and `letter-spacing: -0.05em` (`globals.css:204-216`, `:293-303`). Persian has **no case**, so uppercase is a no-op — but negative letter-spacing on Arabic-script text breaks the joins between letters. It is not tightening; it is damage.
- `line-height: 0.78` (`globals.css:212`). Persian ascenders and descenders are taller and deeper than Latin ones; at 0.78 Vazirmatn will collide with itself. The hero cap arithmetic at `globals.css:278-287` divides by that same `0.78`, so the fit calculation will also be wrong.
- `components/FitOneLine.tsx:44` measures at ≈0.534em per glyph and `learn/[slug]/[item]/page.tsx:126-133` at 0.72em per uppercase character. Both are Latin metrics. Persian glyph advance and the shaping of joined forms make both figures meaningless, and both are used to prevent text being clipped by `overflow: hidden` — so the failure mode is Persian titles with their ends sliced off.

### 7.4 The Persian display weight is not loaded — High
**Violates:** brand guide p.10, which specifies the Persian type system
layer by layer.

The guide's table on p.10:

| Layer | Persian |
|---|---|
| Display | **Vazirmatn 900** |
| Editorial | Vazirmatn 300, large |
| Body / UI | Vazirmatn 400 |

`app/layout.tsx:61-66` loads `weight: ["300", "400", "700"]`.

**900 is not loaded.** So the Persian display layer — the loudest voice,
the counterpart to Kumbh 700 — cannot be set at all. A Persian
`.text-h1` today would fall back to 700, which is a different register,
or synthesise a fake bold.

The comment at `app/layout.tsx:54-60` is otherwise exemplary: it
restates the p.10 bilingual problem correctly (no Persian serif; build
the editorial layer from weight and size instead) and loads 300 for
exactly that reason. It got the hard half right and dropped the easy
half. Adding `"900"` to that array is a one-word fix and it should
happen before any Persian page is built, because every type decision
made in the meantime will be calibrated against the wrong weight.

Also note `subsets: ["arabic"]` at `:64` — correct for Vazirmatn, but
none of the four Latin faces loads a Persian subset, so any Latin
string inside Persian text (and the guide **requires** one: the tagline
is *"never translated"*, p.5) will need explicit font handling. There is
no mechanism for that today. `Assistant.tsx:163-165` has the only
font-switching function in the codebase, and it switches per message,
not per span.

### 7.5 `lang` and `dir` are hardcoded at the root — Medium
`app/layout.tsx:141` — `<html lang="en">`, with no `dir`. Even the
assistant, which does render Persian, renders it inside a document
declared English and LTR. Screen readers will read Persian with an
English speech synthesiser; the browser will not apply Arabic-script
line-breaking or bidi rules at the document level. The per-message
`font-vazirmatn` class at `Assistant.tsx:163` styles it correctly and
tells assistive technology nothing.

Any Persian message containing a Latin fragment — a band score, an
email address, the tagline — will bidi-reorder unpredictably without
`dir="rtl"` or `dir="auto"` on the containing element.

---

## 8. Assumptions about where the visitor lives

The audience per `CLAUDE.md` is *"both inside Iran and the diaspora
(Canada, Germany, Turkey, UAE, Australia)"*. Value 05 in the guide
(p.7) is *"Where you live shouldn't decide who teaches you"*, at a cost
she has accepted: *"everything runs online."*

The site does not currently serve both halves of that audience equally,
and in two places it will simply fail for one of them.

### 8.1 Google OAuth is the primary sign-in, and it is unreachable inside Iran — High
**Violates:** guide p.7, Value 05; and it is a hard functional break,
not a design preference.

`components/AuthSignUp.tsx:305-355` renders "Continue with Google" as
the **first and visually dominant** option — its own taller bar
(`AuthSignUp.tsx:44`), Google's mark on a white disc, above the fork
and above the email form. Google services are blocked or unreliable
from Iranian IP ranges without a VPN.

For a visitor in Tehran the primary path either hangs or bounces them
back with `components/AuthSignUp.tsx:183-188`'s error copy: *"That did
not work. Try again, or use your email instead."* The fallback exists
and is correctly worded — but it is presented as the slower, secondary
route (the comment at `:399` literally calls it *"the slower way in"*),
and the visitor only discovers it after a failure they will read as
*this site is broken.*

The email path has its own version of the same problem: it delivers a
six-digit code to an inbox (`AuthSignUp.tsx:251,276`). Gmail is the
most likely inbox for this audience and is subject to the same
reachability issue.

**Neither of the two sign-in paths is designed for the half of the
audience the site was built for.** Ordering matters here more than
anything else: the email form should lead, and Google should be the
alternative.

### 8.2 Telegram as the single contact channel — Medium, and it cuts the other way
`components/Footer.tsx:22,75-82` makes Telegram the only human contact
route on the site. This is the *right* default for Iran — Telegram is
the dominant channel there and it works.

But it is an unusual choice for the diaspora personas the guide names.
A prospect in Toronto or Berlin is more likely on WhatsApp, email or a
booking link, and Telegram reads to some Western professionals as a
fringe app. The guide's own pitch (p.15) says *"Tell me your target
score and your exam date at [website]"* — a website form — and p.16
sets the CTA as a question that *"produces a reply that can be worked
with."* A form would serve both audiences; Telegram serves one well and
one adequately.

Her email address is already in the repo — `content/kb/contact.en.md`
lists Telegram, email and LinkedIn as the three ways to reach her. The
site surfaces two of the three and omits email, which is the one
channel that works from everywhere.

### 8.3 Nothing on the site acknowledges either location — Medium
**Violates:** guide p.7, Value 05 — a value with a cost attached should
be visible, or it is not doing any work.

Value 05 is the one value that speaks directly to this audience's
lived situation, and it is nowhere on the site. There is no line saying
lessons run online, no timezone, no indication that a student in
Isfahan and a student in Vancouver are equally served. `content/kb/`
knows the consultation is *"about fifteen minutes… online"*
(`how-it-works.en.md`), and again, that is only reachable through the
bot.

Concrete absences a visitor in either place will notice:

- **No pricing or currency anywhere.** For an Iranian visitor the open
  question is whether payment is possible at all (rial, sanctions,
  no international cards); for a diaspora visitor it is which currency.
  The guide has a full pricing page's worth of approved copy (p.17,
  *"If ten sessions get you to 7, I won't sell you twenty"*) and there
  is no pricing page in the route tree.
- **No timezone or availability.** Sessions are online and one-to-one;
  a student in Sydney and one in Tehran are eleven and a half hours
  apart.
- **`content/kb/payment-and-policies.{en,fa}.md` exists.** The
  information is written. It renders on no page.

### 8.4 Third-party dependencies that are unreliable from Iran — Medium
Beyond Google OAuth, the site loads assets from hosts that are blocked
or throttled from Iranian networks, and each one degrades silently:

- **Google Fonts** — all six families, `app/layout.tsx:13-66`. `next/font/google` self-hosts at build time, so this is fine in production; worth stating only because it is the usual trap and this codebase avoided it.
- **`picsum.photos`** — `components/Quote.tsx:34`, `lib/projects.ts:64,101,137`, fetched live at render with `unoptimized`. These are the home page's five thumbnails. From a blocked network they do not load, and the fallback is `bg-media-gray` — five empty grey boxes under the site's best sentence. (They should be removed anyway; see §3.2.)
- **`t.me`** — works from Iran, does not from some corporate networks abroad.

The general pattern: every remote dependency fails to an empty grey
rectangle, and the site has no visible-loading or fallback state for
any of them. A visitor on a slow or filtered connection gets a page
made of grey boxes and cannot tell whether it is broken or just
minimal.

---

## Priority

If only five things get done, these five, in this order:

1. **Put something real in the hero media slot** — `components/Hero.tsx:9`. The site's centrepiece is an empty grey box. (§3.1)
2. **Delete the picsum "work samples" and put marked-up work there instead** — `components/Quote.tsx:6-12`, `lib/projects.ts:64,101,137`. Stock photography captioned as evidence, under the best sentence on the site. (§3.2, §6.2)
3. **Write the method onto a page.** `content/kb/how-it-works.en.md` already contains it, and the guide's proof lines (p.17) are written and unused. Right now a visitor cannot learn how she works without talking to a bot. (§3.3, §3.4)
4. **Move the Telegram CTA out of the footer and above the fold, and demote the email capture.** Currently the site asks for an email address before it has said anything true, and hides the actual conversation in 16px type. (§4.1-4.3)
5. **Decide what bilingual means and load Vazirmatn 900.** The site is English-only for a Persian audience; the display weight the guide specifies is not even loaded. (§7.1, §7.4)

Two fixes that cost almost nothing and should just be done:
`"Our services"` → `"What I do"` (`components/Services.tsx:19`) and
`"The minds behind"` → something singular
(`app/(site)/about/page.tsx:51`). Both are one-word edits that remove a
direct contradiction of a rule the guide states twice.
