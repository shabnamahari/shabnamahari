"use client";

import { useCallback, useState } from "react";

import RevealLine from "./RevealLine";
import Asterisk from "./Asterisk";
import ParenMedia from "./ParenMedia";
import VideoSlot from "./VideoSlot";
import HeroKicker from "./HeroKicker";
import HeroIeltsMark from "./HeroIeltsMark";

const HERO_VIDEO = "/videos/showreel.mp4";

// Speed of the small hero showreel. Try 2 or 1.5.
const HERO_VIDEO_SPEED = 2;

export default function Hero() {
  const media = (
    <VideoSlot
      src={HERO_VIDEO}
      poster="/videos/showreel-poster.jpg"
      grayscale
      playbackRate={HERO_VIDEO_SPEED}
      label="Showreel"
    />
  );

  /*
   * Which of the two is saying IELTS.
   *
   * The coral block reports whether it actually rendered — it hides itself
   * rather than push the page into horizontal scroll — and the corner label
   * stands down only when it did. A breakpoint cannot answer this: the block
   * is sized from measured type against the room left beside GOAL, so where it
   * starts fitting depends on the words, not on a number.
   *
   * It starts true — assume the block has the job — because that resting state
   * is `md:hidden` on the label, which is right on a desktop before anything
   * has been measured and harmless on a phone, where md:hidden does not apply.
   * Starting false paints the label for a moment on every desktop load.
   */
  const [markShown, setMarkShown] = useState(true);
  const handleFit = useCallback((fits: boolean) => setMarkShown(fits), []);

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
          {/* The mark, not a reference.
           *
           * This is read as an orphaned footnote marker roughly once a
           * session, because a "*" in prose points at something and this one
           * points at nothing. It is not that. The same SVG sits immediately
           * left of the same ParenMedia showreel on About, Learn, the two
           * Learn detail routes, MenuOverlay and WorkEntry — seven places,
           * one class string — and none of the other six has ever carried a
           * footnote. It marks the media element sitewide; it is part of the
           * identity, in the brand guide's own glyph rather than a typed "*".
           *
           * A footnote did briefly hang off this one — "Speaking and Writing
           * first.", removed in 5fe5749 along with the component that
           * measured its own fit. That is history, not an obligation: the
           * asterisk predates it here and outlived it everywhere else.
           * Removing it from the hero would make the hero the only page whose
           * showreel is unmarked.
           *
           * aria-hidden for the same reason as the "Showreel" caption below
           * and the "You will reach your" gloss under GOAL: decoration that
           * would otherwise be spliced into the heading's accessible name.
           */}
          <span
            aria-hidden="true"
            className="absolute left-16 md:left-24 -translate-x-full pt-1 w-[calc((0.9em+2.7vw)*1.5)] max-md:w-10 text-ink"
          >
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
      <HeroKicker standDown={markShown} />
      <HeroIeltsMark onFit={handleFit} />
    </div>
  );
}
