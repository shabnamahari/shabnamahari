import type { Metadata } from "next";

import { LegalPage, Section, P, List } from "@/components/LegalPage";
import { LEGAL_CONTACT, LEGAL_UPDATED, PROCESSORS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy — Shabnam Ahari",
  description: "What this site collects, why, and how to have it deleted.",
};

/**
 * Written from the schema rather than from a template.
 *
 * Every claim below was checked against the code: the tables in
 * `supabase/migrations`, the cookies set in `lib/account` and `app/api/chat`,
 * and the four outside services the app actually calls. A policy that lists
 * things a site does not do is not caution, it is noise — and it makes the
 * parts that *are* true harder to believe.
 *
 * Plain English throughout, because the people reading it are learning English.
 * Shabnam's own note: her audience reads English but often is not native in it,
 * so the sentences are short and the words are ordinary.
 */
export default function PrivacyPage() {
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
    <LegalPage title="Privacy Policy" updated={LEGAL_UPDATED}>
      <Section heading="Who holds your information">
        <P>
          This site is run by Shabnam Ahari. Your information is held by her and
          nobody else buys it, rents it, or is sold access to it. If you want to
          know what is held about you, or want it deleted, reach her {contactLine}.
        </P>
      </Section>

      <Section heading="What is collected when you make an account">
        <List
          items={[
            "Your name, if you type one, and your email address.",
            "If you sign in with Google: your name, your email address, and the account identifier Google gives this site. Nothing else — not your contacts, your files, or anything in your Google account.",
            "The one-time codes sent to your inbox. These are stored scrambled rather than as the number itself, stop working after ten minutes, and can only be used once.",
          ]}
        />
      </Section>

      <Section heading="What is collected when you use the assistant">
        <P>
          The assistant is the panel at the top of the site, and the same
          assistant on Telegram. Conversations with it are kept so that it can
          follow what you are asking and so Shabnam can see where it answered
          badly and fix it.
        </P>
        <List
          items={[
            "What you type, and what the assistant replied.",
            "The language of the conversation.",
            "Anything you volunteer about your studies — a target band, an exam date, whether you have sat the exam before, how to reach you. This is only ever what you tell it; it is not worked out about you.",
            "If you mark an answer as wrong, the answer you marked and any note you leave with it.",
          ]}
        />
        <P>
          You can use the assistant without making an account, and without
          giving it your name or address.
        </P>
      </Section>

      <Section heading="Cookies">
        <P>
          There is no advertising here, no analytics, and nothing that follows
          you to other sites. There is no tracking script on this site at all.
          Four small cookies exist, and each has one job:
        </P>
        <List
          items={[
            <>
              <strong>sc_user</strong> — keeps you signed in. It lasts thirty
              days and cannot be read by scripts in your browser.
            </>,
            <>
              <strong>sc_oauth</strong> — set for a few minutes while you are
              signing in with Google, so that the reply coming back is known to
              belong to you and not to somebody else.
            </>,
            <>
              <strong>sc_uid</strong> — an anonymous label so the assistant can
              tell one conversation from another. It is not your name and is not
              linked to you unless you sign in.
            </>,
            <>
              <strong>sc_admin</strong> — only ever set for Shabnam, signing in
              to her own panel.
            </>,
          ]}
        />
      </Section>

      <Section heading="Who else your information reaches">
        <P>
          This site is built on other people&rsquo;s services, and each of them
          handles a part of it. They are given what they need for that part and
          nothing more.
        </P>
        <List
          items={PROCESSORS.map((p) => (
            <>
              <strong>{p.name}</strong> — {p.what}.
            </>
          ))}
        />
        <P>
          One thing worth being plain about: the assistant&rsquo;s answers are
          written by a language model that runs on someone else&rsquo;s
          computers. The text of what you ask it is sent there to be answered.
          Do not type anything into it you would not want leaving this site — a
          password, a bank detail, a passport number. It never needs any of
          those, and Shabnam will never ask for them through it.
        </P>
      </Section>

      <Section heading="How long it is kept">
        <P>
          Accounts are kept until you ask for yours to be deleted. Sign-in codes
          stop working after ten minutes. Conversations are kept while they are
          still useful for improving the assistant, and are deleted on request
          along with everything else.
        </P>
      </Section>

      <Section heading="What you can ask for">
        <P>
          You can ask for a copy of what is held about you, ask for it to be
          corrected, or ask for it to be deleted. Ask {contactLine} and Shabnam
          will do it. You do not have to give a reason.
        </P>
      </Section>

      <Section heading="Children">
        <P>
          This site is meant for adults and for teenagers studying with Shabnam.
          If you are under sixteen, please have a parent or guardian read this
          with you before making an account.
        </P>
      </Section>

      <Section heading="Changes">
        <P>
          If this policy changes, the date at the top changes with it. It has
          been accurate since {LEGAL_UPDATED}.
        </P>
      </Section>
    </LegalPage>
  );
}
