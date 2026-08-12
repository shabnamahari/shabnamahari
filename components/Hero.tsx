"use client";

import RevealLine from "./RevealLine";
import Asterisk from "./Asterisk";
import ParenMedia from "./ParenMedia";
import VideoSlot from "./VideoSlot";

// Drop your file in public/videos/ and set this, e.g. "/videos/hero.mp4".
const HERO_VIDEO: string | undefined = undefined;

export default function Hero() {
  const media = <VideoSlot src={HERO_VIDEO} label="Showreel" />;

  return (
    /*
     * The top padding is the assistant's, not the headline's.
     *
     * The bar now sits permanently across the top of this page, and the
     * headline began directly underneath it with no air in between. This clears
     * the bar and leaves roughly the gap the reference layout keeps between its
     * own bar and its first word. It is padding rather than a margin so the
     * lines still centre in what is left, and the block still fills the
     * viewport on a short window instead of pushing its last line off-screen.
     */
    <h1 className="flex min-h-[100svh] w-full flex-col items-center justify-center gap-y-2 overflow-hidden py-[15px] pt-[clamp(8rem,18vh,13rem)]">
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
          {/* Plays in place — no lightbox, no navigation. */}
          <ParenMedia>{media}</ParenMedia>
        </RevealLine>
        <span className="text-note absolute right-28 top-1/2 max-md:hidden -translate-y-1/2 translate-x-full pl-[1vw] md:pl-[1.5vw]">
          Showreel
        </span>
      </div>

      <div className="flex w-full justify-center">
        <div className="relative flex">
          <span
            className="text-note absolute left-0 top-1/2 max-md:hidden -translate-x-full -translate-y-1/2"
            style={{ marginLeft: "-1.5vw" }}
          >
            You will reach your
          </span>
          <RevealLine delay={0.133} className="text-h1 text-center whitespace-nowrap">
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
        <RevealLine delay={0.2667} className="text-h1 text-center whitespace-nowrap">
          English
        </RevealLine>
      </div>
    </h1>
  );
}
