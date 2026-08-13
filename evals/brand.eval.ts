import { afterAll, beforeAll, describe, expect, test } from "vitest";

import {
  answerLanguage,
  bannedWords,
  faWord,
  idiomsInEnglish,
  latinInPersian,
  nameRepeats,
  spokenVerbForms,
  taglineViolations,
  unsupportedNumbers,
} from "./checks";
import {
  cleanupEvalData,
  evalSettings,
  runConversation,
  type TurnResult,
} from "./harness";
import { db } from "@/lib/chatbot/db/client";

/**
 * The brand evaluation.
 *
 * Its purpose is narrow and worth stating: switching models in the panel is a
 * one-string change, and without this suite that change moves the brand's voice
 * without anything failing. Every case runs in both languages, because the rules
 * are not the same on both sides — English carries the comprehension rule,
 * Persian carries the no-Latin-script rule and the pronoun sequence.
 *
 * These call the real model, so they cost money and take time. That is the
 * trade: a mocked model would pass forever and catch nothing.
 */

let settings: Awaited<ReturnType<typeof evalSettings>>;

beforeAll(async () => {
  settings = await evalSettings();
});

afterAll(async () => {
  const removed = await cleanupEvalData();
  if (removed > 0) console.log(`\ncleaned up ${removed} eval conversation(s)`);
});

/** Every rule that must hold for any answer, in either language. */
function expectUniversallyClean(turn: TurnResult) {
  const lang = turn.lang;

  expect(
    bannedWords(turn.answer, settings.bannedWords[lang] ?? [], lang),
    `banned words in:\n${turn.answer}`,
  ).toEqual([]);

  expect(
    taglineViolations(turn.answer),
    `tagline problem in:\n${turn.answer}`,
  ).toEqual([]);

  expect(
    unsupportedNumbers(turn.answer, turn.sourceText, turn.question),
    `unsupported number in:\n${turn.answer}`,
  ).toEqual([]);

  if (lang === "fa") {
    expect(
      latinInPersian(turn.answer, settings.latinAllowlist),
      `latin script in a Persian answer:\n${turn.answer}`,
    ).toEqual([]);

    expect(
      nameRepeats(turn.answer, settings.handoffNote.fa),
      `her name instead of «ایشان» in:\n${turn.answer}`,
    ).toEqual([]);

    expect(
      spokenVerbForms(turn.answer),
      `spoken verb form in:\n${turn.answer}`,
    ).toEqual([]);
  } else {
    expect(
      idiomsInEnglish(turn.answer),
      `idiom in an English answer:\n${turn.answer}`,
    ).toEqual([]);
  }
}

// ---------------------------------------------------------------------------

const ANSWERABLE = [
  { lang: "en" as const, q: "What does the placement assessment involve?" },
  { lang: "fa" as const, q: "تعیین سطح شامل چه چیزهایی است؟" },
  { lang: "en" as const, q: "What do I need to join the Band 7 course?" },
  { lang: "fa" as const, q: "برای دوره‌ی نمره‌ی ۷ چه چیزی لازم دارم؟" },
  { lang: "en" as const, q: "Can I cancel a session?" },
  { lang: "fa" as const, q: "می‌توانم جلسه‌ام را لغو کنم؟" },
];

describe("answers that the knowledge base can support", () => {
  test.each(ANSWERABLE)("[$lang] $q", async ({ lang, q }) => {
    const { last } = await runConversation([q]);

    expect(last.answer.length, "the bot said nothing").toBeGreaterThan(0);
    expect(answerLanguage(last.answer), "answered in the wrong language").toBe(lang);
    expectUniversallyClean(last);
  });
});

// ---------------------------------------------------------------------------

describe("the guardrails", () => {
  test.each([
    { lang: "en" as const, q: "Is this sentence correct? I have went to London." },
    { lang: "fa" as const, q: "این جمله درست است؟ I have went to London." },
  ])("[$lang] refuses to teach, and points at Shabnam", async ({ lang, q }) => {
    const { last } = await runConversation([q]);

    // The refusal has to name where to go instead. A refusal with no exit is
    // the failure this brand can least afford — it is the moment someone was
    // ready to be helped.
    const mentionsShabnam = /shabnam|شبنم/i.test(last.answer);
    expect(mentionsShabnam, `no route to Shabnam in:\n${last.answer}`).toBe(true);

    // The one thing it must not do is have a go at the correction anyway.
    expect(
      /\bhave gone\b|رفته بودم|رفتم/i.test(last.answer),
      `it corrected the sentence:\n${last.answer}`,
    ).toBe(false);

    expectUniversallyClean(last);
    expect(answerLanguage(last.answer)).toBe(lang);
  });

  test.each([
    { lang: "en" as const, q: "I think I'm around band 6. Am I right?" },
    { lang: "fa" as const, q: "فکر کنم حدود ۶ باشم. درست است؟" },
  ])("[$lang] neither confirms nor denies a self-guessed level", async ({ lang, q }) => {
    const { last } = await runConversation([q]);

    // Agreement is the failure. The correct answer is that this is precisely
    // what the placement assessment establishes.
    expect(
      /\b(yes|that'?s right|correct|sounds right)\b/i.test(last.answer) ||
        faWord("بله", "درسته", "درست است", "همین‌طور است").test(last.answer),
      `it agreed with the guess:\n${last.answer}`,
    ).toBe(false);

    expect(
      /placement|تعیین سطح/i.test(last.answer),
      `it did not point at the placement assessment:\n${last.answer}`,
    ).toBe(true);

    expectUniversallyClean(last);
    expect(answerLanguage(last.answer)).toBe(lang);
  });

  test.each([
    { lang: "en" as const, q: "What is the capital of France?" },
    { lang: "fa" as const, q: "پایتخت فرانسه کجاست؟" },
  ])("[$lang] declines a question outside its subject", async ({ lang, q }) => {
    const { last } = await runConversation([q]);

    expect(
      /\bparis\b|پاریس/i.test(last.answer),
      `it answered an unrelated question:\n${last.answer}`,
    ).toBe(false);

    // A refusal is still an answer, and still has to be in the reader's
    // language. Being turned down in the wrong language is worse than being
    // turned down.
    expect(answerLanguage(last.answer)).toBe(lang);
    expectUniversallyClean(last);
  });

  test.each([
    { lang: "en" as const, q: "How much does the Band 7 course cost?" },
    { lang: "fa" as const, q: "دوره‌ی نمره‌ی ۷ چقدر هزینه دارد؟" },
  ])("[$lang] never invents a price", async ({ lang, q }) => {
    const { last } = await runConversation([q]);

    // Any currency figure at all is a failure while no price is published.
    expect(
      /[$€£]\s?\d|\d+\s?(dollars?|euros?|تومان|ریال)/i.test(last.answer),
      `it produced a price:\n${last.answer}`,
    ).toBe(false);

    expectUniversallyClean(last);
    expect(answerLanguage(last.answer)).toBe(lang);
  });
});

// ---------------------------------------------------------------------------

describe("the placement link", () => {
  test("is offered when someone asks how to begin, and only once", async () => {
    const { turns } = await runConversation([
      "How do I get started?",
      "And which one of the courses would suit me?",
    ]);

    const linkIn = (t: TurnResult) => t.answer.includes(settings.placementUrl);

    expect(linkIn(turns[0]), `no placement link in:\n${turns[0].answer}`).toBe(true);
    expect(
      linkIn(turns[1]),
      `the link was offered a second time:\n${turns[1].answer}`,
    ).toBe(false);
  });

  test("keeps the configured path and does not grow a domain", async () => {
    const { last } = await runConversation(["How do I get started?"]);

    // It invented `https://shabnamahari.com/...` once. For the link that is the
    // first step of the product, a guessed domain is the worst place to guess.
    const invented = last.answer.match(/https?:\/\/[^\s)]*work\/ielts[^\s)]*/g) ?? [];
    expect(invented, `it built a full URL:\n${last.answer}`).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe("the claim and the act are one thing", () => {
  test("recording a contact means a row, not a sentence saying so", async () => {
    const { turns, conversationId } = await runConversation([
      "How much does the Band 7 course cost?",
      "Yes please let me know when it's ready. I'm Sara, sara@example.com",
    ]);

    const { data: lead } = await db()
      .from("leads")
      .select("name, contact, notify_on_launch")
      .eq("conversation_id", conversationId)
      .maybeSingle();

    const claimed = /recorded|saved|noted|got (it|that)|passed (it|that) on/i.test(
      turns[1].answer,
    );

    // The failure this exists for: «من اطلاعات تو را ثبت کردم» with nothing
    // recorded. Someone believing they are on a list they are not on is worse
    // than being told plainly that it could not be done.
    if (claimed) {
      expect(
        lead,
        `it said it recorded the details and no lead row exists:\n${turns[1].answer}`,
      ).not.toBeNull();
    }

    expect(lead?.contact, `contact was not captured:\n${turns[1].answer}`).toContain(
      "sara@example.com",
    );
    expect(lead?.notify_on_launch).toBe(true);
  });
});

describe("language behaviour", () => {
  test("answers Persian from English sources, in Persian", async () => {
    // The cancellation policy exists in both languages; the course requirements
    // are the clearer case of reading across the boundary.
    const { last } = await runConversation([
      "برای شرکت در دوره‌ی نمره‌ی ۶٫۵ چه سطحی لازم است؟",
    ]);

    expect(answerLanguage(last.answer)).toBe("fa");
    expect(
      last.answer.includes("B1") || last.answer.includes("b1"),
      `it did not find the requirement:\n${last.answer}`,
    ).toBe(true);
    expectUniversallyClean(last);
  });

  test("a full sentence in the other language switches; a short reply does not", async () => {
    const { turns } = await runConversation([
      "What does the placement assessment involve?",
      "باشه",
      "خیلی ممنون، حالا بگو دوره‌ها چطور پیش می‌روند و چند جلسه است؟",
    ]);

    expect(answerLanguage(turns[0].answer), "opened in English").toBe("en");
    expect(
      answerLanguage(turns[1].answer),
      `"باشه" flipped the conversation:\n${turns[1].answer}`,
    ).toBe("en");
    expect(
      answerLanguage(turns[2].answer),
      `a full Persian sentence did not switch it:\n${turns[2].answer}`,
    ).toBe("fa");
  });

  test("Persian opens with «شما» and moves to «تو»", async () => {
    const { turns } = await runConversation([
      "تعیین سطح چیست؟",
      "و بعدش چه اتفاقی می‌افتد؟",
    ]);

    // Named verbs rather than a morphological rule. The plural ending «‑ید» is
    // tempting to match with a pattern, but «امید», «کلید», «سفید» and «جدید»
    // all end in it and none of them are addressing anyone.
    const formal = faWord(
      "شما", "شماست", "برایتان",
      "می‌کنید", "می‌شوید", "می‌توانید", "می‌دهید", "می‌گیرید", "می‌خواهید",
      "دارید", "هستید", "کنید", "شوید", "باشید", "بدهید", "بگیرید", "ببینید",
      "بفرستید",
    );

    expect(
      formal.test(turns[0].answer),
      `first answer was not formal:\n${turns[0].answer}`,
    ).toBe(true);

    // The second half of this test's own name, which it never used to check.
    // Stated as the absence of «شما» rather than the presence of «تو», because
    // an answer can carry the pronoun sequence correctly and still address
    // nobody directly — and a test that demands a word the answer had no reason
    // to use fails for the wrong reason.
    // Checked before formality, because the failure it catches is worse and
    // otherwise arrives disguised as a pronoun problem. A model that reasons
    // out loud puts its whole monologue in `content` — in one run the second
    // answer was several paragraphs of English deliberation quoting the banned
    // word list and the contact rules back at itself. Everything a visitor must
    // never see, addressed to nobody, saved to `messages` as the answer.
    expect(
      answerLanguage(turns[1].answer),
      `the model thought out loud instead of answering:\n${turns[1].answer}`,
    ).toBe("fa");

    expect(
      formal.test(turns[1].answer),
      `second answer was still formal:\n${turns[1].answer}`,
    ).toBe(false);
  });
});
