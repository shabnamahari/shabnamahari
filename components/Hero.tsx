"use client";

import Image from "next/image";
import RevealLine from "./RevealLine";
import Asterisk from "./Asterisk";
import ParenMedia from "./ParenMedia";
import { useLightbox } from "./Lightbox";

const HERO_IMAGE = "https://picsum.photos/seed/adcker-hero/800/800";

export default function Hero() {
  const openLightbox = useLightbox();

  const media = (
    <Image
      src={HERO_IMAGE}
      alt="Showreel"
      fill
      sizes="200px"
      className="object-cover"
      unoptimized
    />
  );

  return (
    <section className="flex min-h-[100svh] w-full flex-col items-center justify-center gap-y-2 overflow-hidden py-[15px]">
      <div className="flex w-full justify-center overflow-hidden">
        <RevealLine className="text-h1 text-center whitespace-nowrap">
          The Art
        </RevealLine>
      </div>

      <div className="relative flex shrink-0 items-center px-28">
        <span className="absolute left-24 -translate-x-full pt-1 w-[calc((0.9em+2.7vw)*1.5)] text-ink">
          <Asterisk />
        </span>
        <RevealLine
          delay={0.0667}
          className="text-h1 font-bold flex items-center justify-center"
        >
          <ParenMedia
            onClick={() =>
              openLightbox(
                <Image
                  src={HERO_IMAGE}
                  alt="Showreel"
                  width={1000}
                  height={1000}
                  unoptimized
                  className="h-auto w-full"
                />,
              )
            }
          >
            {media}
          </ParenMedia>
        </RevealLine>
        <span className="text-note absolute right-28 top-1/2 max-md:hidden -translate-y-1/2 translate-x-full pl-[1vw] md:pl-[1.5vw]">
          Showreel
        </span>
      </div>

      <div className="flex w-full justify-center overflow-hidden">
        <RevealLine delay={0.133} className="text-h1 text-center whitespace-nowrap">
          of
        </RevealLine>
      </div>

      <div className="relative flex w-full justify-center overflow-hidden">
        <RevealLine delay={0.2} className="text-h1 text-center whitespace-nowrap">
          Hacking
        </RevealLine>
        <span className="text-note absolute left-4 top-1/2 max-md:hidden -translate-x-full -translate-y-1/2" style={{ marginLeft: "-1.5vw" }}>
          We&rsquo;re built for
        </span>
      </div>

      <div className="flex w-full justify-center overflow-hidden">
        <RevealLine delay={0.2667} className="text-h1 text-center whitespace-nowrap">
          Social
        </RevealLine>
      </div>
    </section>
  );
}
