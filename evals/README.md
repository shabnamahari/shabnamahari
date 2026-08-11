# The brand evaluation

```bash
npm run eval             # everything
npm run eval:retrieval   # retrieval only — cheap and fast
npm run eval:watch       # while changing a prompt
```

## Why it exists

Switching models in the panel is a one-string change. Without these tests that
change moves the brand's voice and nothing fails — the bot still answers, still
sounds fluent, and has quietly started saying "amazing" and guessing at prices.

Every case runs in both languages, because the rules are not symmetric. English
carries the comprehension rule: the reader is learning English, so an idiom is a
defect. Persian carries the no-Latin-script rule and the «شما» → «تو» sequence.
A suite that ran one language and assumed the other would miss half of what it
is for.

## What is checked where

`checks.ts` holds the deterministic half — banned words, Latin script inside
Persian, idioms, invented numbers, the tagline. These read their lists from
`settings`, the same rows the bot is given at request time, so a check can never
disagree with the instruction it is testing. The idiom list is the exception: it
lives in code because nothing injects it into the prompt, so there is no second
copy to drift from.

`retrieval.eval.ts` runs without the model. It is cheap enough for every push,
and it answers the first question a brand failure raises — did the bot say the
wrong thing, or never find the right passage?

`brand.eval.ts` runs the real brain end to end. Against the real model, not a
mock: the thing under test is the combination of this prompt, this model and
this knowledge base, and a mocked model would pass forever.

## Practicalities

**It is slow, and that is the Cohere trial key.** Ten calls a minute; one search
spends four of them. The client paces itself rather than failing, so a full run
takes minutes. A production key removes the wait.

**It costs money.** Each case is at least one model call. The CI workflow runs
retrieval on every push and the brand suite only on pull requests, for that
reason.

**It writes to the database and cleans up after itself.** Conversations are
created under an `eval-` prefix and removed in `afterAll`. Leads, intake rows
and unanswered questions are deleted first — they are declared `on delete set
null` so that a real lead outlives its conversation, which means deleting the
conversation first would strand them.

## When something fails

Read the message before changing anything. Every assertion prints the answer
that failed it, and most failures so far have been real:

- the bot inventing a domain for the placement link
- a Persian question retrieving nothing while its English twin worked
- eighteen near-empty pages outranking the placement assessment
- a confident "you'll have your result the same day" that the sources never said

The temptation is to loosen the assertion. Check first whether the assertion is
right and the bot is wrong, because so far it has been.
