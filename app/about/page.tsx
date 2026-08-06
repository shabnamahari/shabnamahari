import type { Metadata } from "next";
import Image from "next/image";
import RevealLine from "@/components/RevealLine";
import Asterisk from "@/components/Asterisk";
import ParenMedia from "@/components/ParenMedia";
import ShowReel from "@/components/ShowReel";

export const metadata: Metadata = {
  title: "About — Shabnam Ahari",
  description:
    "I know what it feels like to be judged on a language that isn't yours.",
};

const PHOTOS = [
  { num: "01", image: "/images/about/shabnam-01.jpg" },
  { num: "02", image: "/images/about/shabnam-02.jpg" },
  { num: "03", image: "/images/about/shabnam-03.jpg" },
];

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-y-[100px] pb-[100px] md:gap-y-[200px] md:pb-[200px]">
      <h1 className="flex min-h-[100svh] w-full flex-col items-center justify-center gap-y-2 overflow-hidden py-[15px]">
        <div className="flex w-full justify-center overflow-hidden">
          <RevealLine className="text-h1 text-center whitespace-nowrap">
            I am
          </RevealLine>
        </div>

        <div className="relative flex shrink-0 items-center px-28">
          <span className="absolute left-24 w-[calc((0.9em+2.7vw)*1.5)] -translate-x-full pt-1 text-ink">
            <Asterisk />
          </span>
          <RevealLine
            delay={0.0667}
            className="text-h1 flex items-center justify-center font-bold"
          >
            <ParenMedia>
              <ShowReel
                images={PHOTOS.map((photo) => photo.image)}
                beat={0.5}
                alt="Shabnam Ahari"
              />
            </ParenMedia>
          </RevealLine>
          <span className="text-note absolute right-28 top-1/2 max-md:hidden -translate-y-1/2 translate-x-full pl-[1vw] md:pl-[1.5vw]">
            The minds behind
          </span>
        </div>

        <div className="flex w-full justify-center overflow-hidden">
          <RevealLine delay={0.133} className="text-h1 text-center whitespace-nowrap">
            Shabnam
          </RevealLine>
        </div>

        <div className="flex w-full justify-center overflow-hidden">
          <RevealLine delay={0.2} className="text-h1 text-center whitespace-nowrap">
            Ahari
          </RevealLine>
        </div>
      </h1>

      <div className="page-margin page-grid">
        <div className="col-span-10 col-start-2 flex flex-col items-center justify-center gap-y-[30px]">
          <RevealLine as="h2" className="text-h2 text-confirm pt-2 text-center">
            I know what it feels like to be judged on a language that
            isn&rsquo;t yours.
          </RevealLine>
          <p className="max-w-3xl text-center">
            I was a second-language student myself, with my own learning
            differences to work around. That&rsquo;s exactly why I listen
            before I correct — and why I don&rsquo;t sugarcoat what&rsquo;s
            not working.
          </p>
        </div>
      </div>

      <div className="page-margin page-grid">
        <div className="col-span-10 col-start-2 flex flex-col items-center justify-center gap-y-[30px]">
          <RevealLine as="h2" className="text-h2 text-confirm pt-2 text-center">
            I find what&rsquo;s actually costing you marks, adapt fast, and
            stay until it&rsquo;s fixed.
          </RevealLine>
          <p className="max-w-3xl text-center">
            Years of teaching English have shaped how I work. IELTS is where
            I&rsquo;ve focused that experience most recently — the same
            method, aimed at your exact band.
          </p>
          <a href="/services" className="body-link">
            More about our programs
          </a>
        </div>
      </div>

      <div className="page-margin flex flex-col gap-y-[50px]">
        <div className="page-grid">
          <div className="col-span-10 col-start-2 flex justify-center">
            <RevealLine as="h2" className="text-h2 pt-2 text-center">
              A normal day: marking, correcting, and staying a little longer
              than planned.
            </RevealLine>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-[15px] gap-y-[50px] sm:grid-cols-2 lg:grid-cols-3">
          {PHOTOS.map((photo) => (
            <div key={photo.num} className="flex flex-col gap-y-[15px]">
              <span className="text-note">( {photo.num} )</span>
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-media-gray">
                <Image
                  src={photo.image}
                  alt={`Shabnam Ahari ${photo.num}`}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  unoptimized
                  className="object-cover"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
