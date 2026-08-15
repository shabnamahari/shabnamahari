import type { Metadata } from "next";

import { requireAccount } from "@/lib/account/current";
import { enrolmentsFor } from "@/lib/account/enrolments";
import AccountPanels from "@/components/account/AccountPanels";
import SignOut from "@/components/account/SignOut";

export const metadata: Metadata = {
  title: "Your Account — Shabnam Ahari",
};

/**
 * Where signing in lands, at /myaccount on Shabnam's instruction.
 *
 * It opens the way every other page on this site opens: a screen of type, set
 * in the hero's own face and size, saying the one true thing there is to say
 * about what is behind it. Then the panels — sign-up's panels, on the site's
 * cream as /auth stands them, because this page is not the footer and should
 * not borrow its black.
 *
 * What the panels hold is mostly not built yet, and they say so rather than
 * showing a plausible figure. The exception is the third: it reads the
 * `enrolments` table, which is empty until Shabnam puts somebody on a course.
 *
 * `dynamic` because it must never be prerendered or cached — it is different
 * for every reader and would otherwise be built once, at deploy, for nobody.
 */
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const account = await requireAccount();
  const courses = await enrolmentsFor(account.id);

  return (
    <div className="flex flex-col gap-y-[100px] pb-[100px] md:gap-y-[200px] md:pb-[200px]">
      {/*
        The opening screen, on the hero's own stack.
        --------------------------------------------------------------------
        `.hero-stack` sizes its lines to whatever height is left over, and what
        it is told to divide that height among is `--hero-lines`. There are
        three lines of type here and the count says four, or five on a phone:
        the extra is the room the welcome above them takes, which the stack has
        no other way to learn about. Over-reserving costs slightly smaller
        capitals; under-reserving would put the last line off the bottom of a
        short window, which is the fault this cap exists to prevent.
      */}
      {/*
        And `--hero-measure` is the width one line of this may take, which the
        stack cannot work out for itself — it is the page that knows its own
        longest line. Above md that line is "Your learning path" whole, about
        11.2 capitals wide once Kumbh's tight tracking is counted; below md the
        clause is allowed to wrap, so the longest thing that must fit on one
        line is the word "learning". The 80px is the page margin either side
        plus `.text-h1`'s own horizontal padding, which sits inside its border
        box.

        Below md the clause wraps, and `--hero-gap` is what keeps the three
        phrases three: wrapped halves sit almost touching at line-height 0.78,
        so at the stack's usual 0.5rem the sentence read as one six-line wall
        rather than as the three lines Shabnam wrote.
      */}
      <section className="hero-stack max-md:[--hero-gap:1.5rem] [--hero-lines:5] [--hero-measure:calc((100vw-80px)/5.4)] md:[--hero-lines:4] md:[--hero-measure:calc((100vw-80px)/11.2)]">
        {/*
          Centred, capitals, and the learner's own name — Shabnam's line, and
          the first word of the page is whoever is reading it.

          Uppercased by the stylesheet rather than in the string, so the name
          stays cased the way its owner typed it everywhere it is copied, read
          aloud or searched for.
        */}
        {/* The stack's own 0.5rem gap sets three lines of one sentence; this is
            a different sentence, and at that gap the two read as one block of
            type with a change of face halfway down. */}
        <h1 className="text-h2 mb-[3vh] px-[15px] text-center uppercase">
          {account.name
            ? `${account.name}, welcome to your account`
            : "Welcome to your account"}
        </h1>

        {/*
          Three lines in the hero's face and size. Kept as three separate lines
          because that is how Shabnam wrote it and how the home page sets its
          own sentence — the break is the typography, not the wrapping.
        */}
        <p className="text-h1 text-center md:whitespace-nowrap">This is where</p>
        <p className="text-h1 text-center md:whitespace-nowrap">
          Your learning path
        </p>
        <p className="text-h1 text-center md:whitespace-nowrap">Will live</p>
      </section>

      <section className="page-margin flex flex-col items-center gap-y-[60px]">
        <div className="w-full">
          <AccountPanels
            name={account.name}
            email={account.email}
            courses={courses}
          />
        </div>

        <SignOut />
      </section>
    </div>
  );
}
