"use client";

import Image from "next/image";
import RevealLine from "./RevealLine";

/*
 * `pos` is each photograph's `object-position`.
 *
 * The box is 4:3 and every photograph is portrait, so `cover` scales each one
 * to the box's width and spends the surplus height — the percentage picks
 * which horizontal band survives. It is per-image because the subject sits at
 * a different height in each frame; the values were read off the frames rather
 * than guessed, and being percentages they hold at 150px and 218px alike.
 *
 * Written as an inline style, not a Tailwind arbitrary class: editing a number
 * inside a generated class name is what makes Turbopack serve a stale
 * stylesheet, and the resulting "layout bug" has cost this project time twice.
 */
const THUMBNAILS = [
  {
    num: "01",
    src: "/proof/01.jpeg",
    alt: "A group class in progress on a laptop, the video grid full of students",
    // The laptop screen occupies 11%-46% of this frame; the rest is phone
    // screenshot furniture above and keyboard below. 17% opens the window on
    // the screen and leaves both out.
    pos: "center 17%",
  },
  {
    num: "02",
    src: "/proof/02.jpeg",
    alt: "The Official Cambridge Guide to IELTS, a pencil resting across its cover",
    // The wordmark sits at 10%-19%, and centring opened the window at 21.9% —
    // just under it. 14% keeps the title and the whole colour wheel.
    pos: "center 14%",
  },
  {
    num: "03",
    src: "/proof/03.jpeg",
    alt: "A slide shared with a live online class, seen on a laptop screen",
    pos: "center 50%",
  },
  {
    num: "04",
    src: "/proof/04.jpeg",
    alt: "German verb conjugation tables open on a laptop screen",
    pos: "center 50%",
  },
  {
    num: "05",
    src: "/proof/05.jpeg",
    alt: "An open coursebook, its exercises answered in pencil, among a spread of pens",
    pos: "center 50%",
  },
];

export default function Quote() {
  return (
    <section className="page-margin flex flex-col items-center gap-y-step-2 py-step-3 md:py-step-4">
      <RevealLine as="h2" className="text-h2 max-w-5xl text-center">

        One student, one learning path — built to end the day you no longer
        need me. Thousands of people have your score. None of them have it
        for your reasons.
      </RevealLine>

      <a href="/about" className="body-link">
        More about me
      </a>

      <div className="flex w-full justify-center max-md:flex-col max-md:items-center max-md:gap-y-step-2 md:justify-between">
        {THUMBNAILS.map((thumb) => (
          <div key={thumb.num} className="flex flex-col gap-y-gutter self-center">
            <span className="text-note">( {thumb.num} )</span>
            <div className="relative aspect-[4/3] w-[218px] overflow-hidden bg-media-gray md:w-[150px] xl:w-[218px]">
              <Image
                src={thumb.src}
                alt={thumb.alt}
                fill
                sizes="220px"
                className="proof-media object-cover"
                style={{ objectPosition: thumb.pos }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
