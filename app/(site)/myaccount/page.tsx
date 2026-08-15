import type { Metadata } from "next";

import { requireAccount } from "@/lib/account/current";
import { enrolmentsFor } from "@/lib/account/enrolments";
import AccountPanels from "@/components/account/AccountPanels";

export const metadata: Metadata = {
  title: "Your Account — Shabnam Ahari",
};

/**
 * Where signing in lands, at /myaccount on Shabnam's instruction.
 *
 * One screen, and three things stacked in depth rather than in a column: the
 * welcome up against the assistant's bar, the sentence set in the hero's own
 * face filling the window behind, and the panels standing over the middle of
 * it. The panels are glass, so the capitals go on showing through them — which
 * is the whole reason Shabnam asked for them to come over the type rather than
 * to sit underneath it, and it is what the assistant's panel does on every
 * other page of this site.
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
    /*
     * `relative` for the two layers that hang off this section rather than
     * standing in its column — the welcome at the top and the panels across the
     * middle. Neither is in the flow, which is what lets the sentence be
     * centred in the window as though it were alone there.
     *
     * `--hero-lines` is three above md, where each of Shabnam's lines sets on
     * one line, and five below it, where they wrap; `--hero-measure` is the
     * width one line may take, which the stack cannot work out for itself
     * because only the page knows its own longest line. Above md that is "path
     * will live" — fourteen characters, about 8.6 capitals wide once Kumbh's
     * tight tracking is counted. Below md the longest thing that must fit is
     * the word "learning". The 80px is the page margin either side plus
     * `.text-h1`'s own horizontal padding, which sits inside its border box.
     *
     * `--hero-gap` is the air between the lines, and it is bigger below md for
     * the same reason: where a line wraps, its halves sit almost touching at
     * line-height 0.78, and at the stack's usual 0.5rem Shabnam's three lines
     * read as one wall of six.
     */
    <section className="hero-stack relative max-md:[--hero-gap:1.5rem] [--hero-lines:5] [--hero-measure:calc((100vw-80px)/5.4)] md:[--hero-lines:3] md:[--hero-measure:calc((100vw-80px)/8.6)]">
      {/*
        The welcome, up under the assistant's bar.
        --------------------------------------------------------------------
        68px because the bar is fixed 15px from the top of every page and 42px
        tall, so it ends at 57 wherever it is read — this is the first line
        that clears it. Out of the flow, so the sentence below is centred in
        the whole window rather than in what is left over.

        Kumbh, small, on Shabnam's instruction: the same face as the capitals
        below it, at label size. Uppercased by the stylesheet rather than in
        the string, so the name stays cased the way its owner typed it
        everywhere it is copied, read aloud or searched for.
      */}
      <h1 className="font-kumbh absolute inset-x-0 top-[68px] px-[15px] text-center text-[clamp(1rem,1.4vw,1.375rem)] font-bold tracking-[-0.02em] uppercase">
        {account.name
          ? `${account.name}, welcome to your account`
          : "Welcome to your account"}
      </h1>

      {/* Three lines, broken where Shabnam breaks them. The break is the
          typography, not the wrapping. */}
      <p className="text-h1 text-center md:whitespace-nowrap">This is where</p>
      <p className="text-h1 text-center md:whitespace-nowrap">your learning</p>
      <p className="text-h1 text-center md:whitespace-nowrap">path will live</p>

      {/*
        And the panels over the top of it.

        Pinned to the stack's content box — from under the top clearance to the
        floor — rather than to the section, so they centre on the sentence
        rather than a clearance-worth above it.
      */}
      <div className="absolute inset-x-0 top-[var(--hero-top)] bottom-[15px] flex items-center justify-center px-[15px]">
        <div className="w-full">
          <AccountPanels
            name={account.name}
            email={account.email}
            courses={courses}
          />
        </div>
      </div>
    </section>
  );
}
