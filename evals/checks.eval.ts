import { describe, expect, test } from "vitest";

import { nameRepeats, spokenVerbForms } from "./checks";

/**
 * The half of the suite that needs no model.
 *
 * Everything else in `evals/` calls OpenRouter and Cohere, costs money and
 * takes minutes, and has never once run against the paid model. These two
 * checks are pure functions over a string, so they can be proved here and now —
 * and they are the two that most need it: a guardrail that reddens a good
 * answer is worse than no guardrail, because it teaches whoever reads the run
 * to stop believing it.
 *
 * That is not hypothetical in this repo. The Latin allow-list check once
 * rejected fifteen words out of a Persian answer Shabnam had written and signed
 * off. The false-positive cases below are the ones that lesson bought.
 */

// The line the bot appends verbatim when it hands someone over. Shabnam wrote
// it and decided it keeps her name; the check subtracts it before counting.
const HANDOFF = "این‌ها راه‌هایی هستند که می‌توانید از طریقشان با شبنم در ارتباط باشید.";

describe("her name once, then «ایشان»", () => {
  test("one mention is fine", () => {
    expect(nameRepeats("جلسه‌ی مشاوره با شبنم برگزار می‌شود.", HANDOFF)).toEqual([]);
  });

  test("no mention is fine", () => {
    expect(nameRepeats("اولین قدم تعیین سطح است.", HANDOFF)).toEqual([]);
  });

  test("name then «ایشان» is what the rule asks for", () => {
    expect(
      nameRepeats(
        "جلسه توسط شبنم برگزار می‌شود. تنظیمش مستقیماً با خود ایشان است.",
        HANDOFF,
      ),
    ).toEqual([]);
  });

  test("twice is the failure", () => {
    const found = nameRepeats(
      "شبنم درباره‌ی مسیر با شما صحبت می‌کند. همچنین شبنم در ثبت‌نام کمک می‌کند.",
      HANDOFF,
    );
    expect(found).toHaveLength(1);
    expect(found[0].detail).toContain("2");
  });

  test("the handoff line does not count against the answer", () => {
    // One mention in the model's own text, one in the fixed line. Counting the
    // fixed line would fail every answer that hands someone over.
    expect(
      nameRepeats(`جلسه توسط شبنم برگزار می‌شود.\n\n${HANDOFF}`, HANDOFF),
    ).toEqual([]);
  });

  test("the handoff line alone is not a violation", () => {
    expect(nameRepeats(HANDOFF, HANDOFF)).toEqual([]);
  });
});

describe("written verbs, warm words", () => {
  test("the warm words 0023 allows are not violations", () => {
    expect(
      spokenVerbForms(
        "خب، الان یه قدم مانده. بعدش یه‌کم تمرین لازم است و همین. راستش چند تا نکته هم هست.",
      ),
    ).toEqual([]);
  });

  test("a whole written answer is clean", () => {
    expect(
      spokenVerbForms(
        "اولین قدم تعیین سطح است. این آزمون مهارت‌ها را می‌سنجد و رایگان است. " +
          "بعد از آن مشخص می‌شود کدام دوره به کارتان می‌آید.",
      ),
    ).toEqual([]);
  });

  test("«می‌سنجه» is caught — the model actually wrote this one", () => {
    const found = spokenVerbForms("آزمونی که مهارت‌ها را می‌سنجه.");
    expect(found.map((v) => v.found)).toEqual(["می‌سنجه"]);
  });

  test("«می‌کنه» and «باشه» are caught", () => {
    expect(spokenVerbForms("کمکت می‌کنه هر چی باشه.").map((v) => v.found)).toEqual([
      "می‌کنه",
      "باشه",
    ]);
  });

  test("«رو» for «را» is caught, and «بده» beside it is not", () => {
    // «بده» is the written imperative. It was on the list for exactly one run,
    // and this case is why it is not on it now.
    expect(spokenVerbForms("آزمون رو بده.").map((v) => v.found)).toEqual(["رو"]);
  });

  test("«روی» and «روز» are not «رو»", () => {
    // The whole reason the boundary helper exists: substring matching would
    // call both of these a violation, and both are ordinary written Persian.
    expect(spokenVerbForms("روی سایت، روزهای زوج، روش کار همین است.")).toEqual([]);
  });

  test("«دیگر» is written and «دیگه» is not", () => {
    expect(spokenVerbForms("یک نکته‌ی دیگر هم هست.")).toEqual([]);
    expect(spokenVerbForms("یه نکته‌ی دیگه هم هست.").map((v) => v.found)).toEqual([
      "دیگه",
    ]);
  });

  test("an English answer has nothing to report", () => {
    expect(spokenVerbForms("The assessment is free and takes about an hour.")).toEqual(
      [],
    );
  });
});
