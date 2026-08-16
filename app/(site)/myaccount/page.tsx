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
 * One screen, and two things stacked in depth rather than in a column: the
 * sentence set in the hero's own face filling the window, and a bar at the top
 * that opens three panels over it. The panels are glass, so the capitals go on
 * showing through them — which is the whole reason Shabnam asked for them to
 * come over the type rather than to sit underneath it, and it is what the
 * assistant's panel does on every other page of this site.
 *
 * The welcome line that used to sit at the top is gone on her instruction, and
 * the reader's name moved onto the bar — which is the one control here, so it
 * is now both the label for the page and the thing you press to open it.
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
     * `--hero-lines` is five above md, where each of Shabnam's lines sets on
     * one line, and six below it, where the long one wraps; `--hero-measure`
     * is the width one line may take, which the stack cannot work out for
     * itself because only the page knows its own longest line. Above md that
     * is "Learning path" — thirteen characters, about 8.4 capitals wide once
     * Kumbh's tight tracking is counted. Below md the longest thing that must
     * fit is the word "Learning". The 80px is the page margin either side plus
     * `.text-h1`'s own horizontal padding, which sits inside its border box.
     *
     * `--hero-gap` is the air between the lines, and it is bigger below md for
     * the same reason: where a line wraps, its halves sit almost touching at
     * line-height 0.78, and at the stack's usual 0.5rem Shabnam's three lines
     * read as one wall of six.
     */
    <section className="hero-stack relative max-md:[--hero-gap:1.5rem] [--hero-lines:6] [--hero-measure:calc((100vw-80px)/5.4)] md:[--hero-lines:5] md:[--hero-measure:calc((100vw-80px)/8.4)]">
      {/*
        Five lines, broken where Shabnam breaks them. The break is the
        typography, not the wrapping — and it is what sets the size, since the
        longest line is what every line has to be small enough to be.

        `display: contents` on the heading, which is the whole trick here: the
        page's welcome line is gone on her instruction, so the sentence is the
        heading now and has to be marked as one — but `.hero-stack` sizes and
        spaces its own flex children, and an `h1` wrapped around the five lines
        would be one child holding five. With `contents` the spans are the flex
        children and the h1 is only the label around them. Spans rather than
        paragraphs because an `h1` may hold phrasing content and nothing else.
      */}
      <h1 className="contents">
        <span className="text-h1 block text-center md:whitespace-nowrap">This is</span>
        <span className="text-h1 block text-center md:whitespace-nowrap">Where</span>
        <span className="text-h1 block text-center md:whitespace-nowrap">Your</span>
        <span className="text-h1 block text-center md:whitespace-nowrap">
          Learning path
        </span>
        <span className="text-h1 block text-center md:whitespace-nowrap">
          Will live
        </span>
      </h1>

      {/* The bar, at the top of the page, and the three it opens over the type.
          It places itself — see AccountPanels. */}
      <AccountPanels
        name={account.name}
        email={account.email}
        courses={courses}
      />
    </section>
  );
}
