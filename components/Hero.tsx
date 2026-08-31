"use client";

import RevealLine from "./RevealLine";
import Asterisk from "./Asterisk";
import ParenMedia from "./ParenMedia";
import VideoSlot from "./VideoSlot";
import HeroKicker from "./HeroKicker";
import HeroFootnote from "./HeroFootnote";
import HeroIeltsMark from "./HeroIeltsMark";

// Drop your file in public/videos/ and set this, e.g. "/videos/hero.mp4".
const HERO_VIDEO: string | undefined = undefined;

export default function Hero() {
  const media = <VideoSlot src={HERO_VIDEO} label="Showreel" />;

  return (
    /*
     * The box the two labels hang off, and the reason it exists.
     *
     * They were inside the h1, which made them part of the heading's
     * accessible name: a screen reader announced the tagline with a category
     * label and a footnote spliced into it. They are labels about the
     * headline, not the headline, so they are siblings of it now.
     *
     * The wrapper is only a positioning context. It takes its size from the
     * h1, which is still the thing that is 100svh tall, so both labels land
     * exactly where they did.
     */
    <div data-hero className="relative">
      {/* Five lines, so the whole sentence is visible on a short window — see
          .hero-stack in globals.css. */}
      <h1 className="hero-stack">
        <div className="flex w-full justify-center overflow-hidden">
          <RevealLine className="text-h1 text-center whitespace-nowrap">
            Your
          </RevealLine>
        </div>

        <div className="relative flex shrink-0 items-center px-16 md:px-28">
          <span className="absolute left-16 md:left-24 -translate-x-full pt-1 w-[calc((0.9em+2.7vw)*1.5)] max-md:w-10 text-ink">
            <Asterisk />
          </span>
          <RevealLine
            delay={0.0667}
            className="text-h1 font-bold flex items-center justify-center"
          >
            {/* Plays in place — no lightbox, no navigation.
             *
             * Hidden from the accessible name: the brackets announce as two
             * stray ")" and the placeholder adds a third "Showreel" to a
             * heading that is meant to read as one sentence. It is decoration
             * here, and nothing is lost — it is not focusable and leads
             * nowhere. If it ever gains a lightbox it becomes a control and
             * this has to come off.
             */}
            <span aria-hidden="true">
              <ParenMedia>{media}</ParenMedia>
            </span>
          </RevealLine>
          {/* A caption on the media, not a word of the sentence. */}
          <span
            aria-hidden="true"
            className="text-note absolute right-28 top-1/2 max-md:hidden -translate-y-1/2 translate-x-full pl-[1vw] md:pl-[1.5vw]"
          >
            Showreel
          </span>
        </div>

        <div className="flex w-full justify-center">
          {/* Marked so the coral block can measure this word's cap height. */}
          <div data-hero-goal className="relative flex">
            {/* Read aloud, this lands mid-sentence as "You will reach your
             *  goal speaks English". It is a gloss on the tagline rather than
             *  part of it, and it says what the tagline already says, so
             *  hiding it costs a listener nothing and buys a heading that
             *  parses.
             */}
            <span
              aria-hidden="true"
              className="text-note absolute left-0 top-1/2 max-md:hidden -translate-x-full -translate-y-1/2"
              style={{ marginLeft: "-1.5vw" }}
            >
              You will reach your
            </span>
            <RevealLine
              delay={0.133}
              className="text-h1 text-center whitespace-nowrap"
            >
              goal
            </RevealLine>
          </div>
        </div>

        <div className="flex w-full justify-center overflow-hidden">
          <RevealLine
            delay={0.2}
            className="text-h1 text-center whitespace-nowrap"
          >
            speaks
          </RevealLine>
        </div>

        <div className="flex w-full justify-center overflow-hidden">
          <RevealLine
            delay={0.2667}
            className="text-h1 text-center whitespace-nowrap"
          >
            English
          </RevealLine>
        </div>
      </h1>

      {/* Outside the heading, and outside the stack: none of these counts
          towards --hero-lines, so no word changes size. */}
      <HeroKicker />
      <HeroFootnote />
      <HeroIeltsMark />
    </div>
  );
}
