import type { Metadata } from "next";

import { LegalPage, Section, P, List } from "@/components/LegalPage";
import { LEGAL_CONTACT, LEGAL_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms — Shabnam Ahari",
  description: "What this site is, what an account gets you, and what it does not promise.",
};

/**
 * Short, and specific to what this site actually is.
 *
 * The two clauses that matter here are the two a template would bury: the
 * assistant is a language model and can be wrong, and nobody can promise an
 * exam result. Both are said early and plainly, because someone signing up to
 * an IELTS studio is entitled to know exactly what is being offered before they
 * are told they agreed to it.
 *
 * Nothing here claims a right the site does not exercise, and nothing promises
 * a thing it cannot do. No payment is taken here yet — lessons are paid for
 * with Shabnam directly — so there is no refund clause, because there is
 * nothing to refund. She has said a payment page is coming, so the section
 * says that rather than declaring the absence permanent: a terms page that
 * tells people to be suspicious of any request to pay would turn into a
 * liability on the day she adds a real one.
 */
export default function TermsPage() {
  const contactLine = (
    <>
      on{" "}
      <a href={LEGAL_CONTACT.telegram} target="_blank" rel="noreferrer" className="body-link">
        Telegram
      </a>
      , by email at{" "}
      <a href={`mailto:${LEGAL_CONTACT.email}`} className="body-link">
        {LEGAL_CONTACT.email}
      </a>
      , or on{" "}
      <a href={LEGAL_CONTACT.linkedin} target="_blank" rel="noreferrer" className="body-link">
        LinkedIn
      </a>
    </>
  );

  return (
    <LegalPage title="Terms" updated={LEGAL_UPDATED}>
      <Section heading="What this site is">
        <P>
          This is the site of Shabnam Ahari, who teaches IELTS and business
          English. It describes what she teaches, answers questions about it
          through an assistant, and lets you make an account. Lessons themselves
          are arranged with her directly.
        </P>
      </Section>

      <Section heading="Your account">
        <P>
          You can make an account with your email address or with Google. Use an
          address you can actually read, because signing in works by sending a
          code to it — whoever can read that inbox can get into the account.
        </P>
        <P>
          Give a real name if you give one. You can ask for your account to be
          deleted at any time, {contactLine}, and you do not have to say why.
        </P>
        <P>
          Accounts are for adults. Shabnam teaches people over eighteen, and
          this site is not meant for anyone younger.
        </P>
      </Section>

      <Section heading="The assistant can be wrong">
        <P>
          The assistant is a language model. It answers from what it has been
          told about the courses, and like every model of its kind it can be
          confidently mistaken — about a price, a date, a detail of the exam.
        </P>
        <P>
          Treat what it says as a helpful first answer, not as a promise. If
          something matters — what a course costs, when it starts, what it
          includes — check it with Shabnam before you rely on it. Where the
          assistant and Shabnam disagree, Shabnam is right.
        </P>
      </Section>

      <Section heading="No promise about your result">
        <P>
          Nobody can guarantee a band score, and this site does not. What is
          offered is teaching, a plan built around your goal, and honest
          feedback about where you actually stand. What you get out of it
          depends on the work you put in, and on things neither of us controls.
        </P>
        <P>
          Anything on this site about results describes what students have done,
          not what you are assured of.
        </P>
      </Section>

      <Section heading="Payment">
        <P>
          Fees are agreed with Shabnam directly, and paid to her directly. This
          site does not take payment today — there is no card form anywhere on
          it.
        </P>
        <P>
          That is expected to change: a payment page is planned. When it
          arrives, payment will go through a payment company rather than being
          handled here, and this page will be updated to say who that is before
          it takes anybody&rsquo;s money.
        </P>
      </Section>

      <Section heading="Using it reasonably">
        <List
          items={[
            "Do not try to break into other people's accounts, or into the site.",
            "Do not use the assistant to send abuse, or to flood it with automated requests — there are limits in place and they will stop you.",
            "The writing, images and course material on this site are Shabnam's. Read them, quote them, link to them; do not republish them as your own.",
          ]}
        />
        <P>
          An account being used to do any of the above can be closed without
          warning.
        </P>
      </Section>

      <Section heading="Changes">
        <P>
          These terms can change — if the site gains something that needs
          covering, this page covers it, and the date at the top changes. They
          have been accurate since {LEGAL_UPDATED}.
        </P>
      </Section>

      <Section heading="Questions">
        <P>Anything unclear here, ask {contactLine}. A real person answers.</P>
      </Section>
    </LegalPage>
  );
}
