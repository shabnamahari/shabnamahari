import type { Metadata } from "next";
import Image from "next/image";
import RevealLine from "@/components/RevealLine";
import Asterisk from "@/components/Asterisk";
import ParenMedia from "@/components/ParenMedia";
import VideoSlot from "@/components/VideoSlot";

export const metadata: Metadata = {
  title: "About — Adcker",
  description: "The minds behind Adcker.",
};

// Swap these two for your own photos and names.
const TEAM = [
  {
    num: "01",
    name: "Ana Haack",
    role: "( Founder )",
    image: "https://picsum.photos/seed/adcker-person-1/900/675",
  },
  {
    num: "02",
    name: "Gabriela Osuna",
    role: null,
    image: "https://picsum.photos/seed/adcker-person-2/900/675",
  },
];

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-y-[100px] pb-[100px] md:gap-y-[200px] md:pb-[200px]">
      <h1 className="flex min-h-[100svh] w-full flex-col items-center justify-center gap-y-2 overflow-hidden py-[15px]">
        <div className="flex w-full justify-center overflow-hidden">
          <RevealLine className="text-h1 text-center whitespace-nowrap">
            We
          </RevealLine>
        </div>

        <div className="flex w-full justify-center">
          <div className="relative flex">
            <RevealLine
              delay={0.0667}
              className="text-h1 text-center whitespace-nowrap"
            >
              Are
            </RevealLine>
            <span
              className="text-note absolute left-0 top-1/2 max-md:hidden -translate-x-full -translate-y-1/2"
              style={{ marginLeft: "-2vw" }}
            >
              The team
            </span>
          </div>
        </div>

        <div className="relative flex shrink-0 items-center px-28">
          <span className="absolute left-24 w-[calc((0.9em+2.7vw)*1.5)] -translate-x-full pt-1 text-ink">
            <Asterisk />
          </span>
          <RevealLine
            delay={0.133}
            className="text-h1 flex items-center justify-center font-bold"
          >
            <ParenMedia>
              <VideoSlot label="The team" />
            </ParenMedia>
          </RevealLine>
          <span className="text-note absolute right-28 top-1/2 max-md:hidden -translate-y-1/2 translate-x-full pl-[1vw] md:pl-[1.5vw]">
            The minds behind
          </span>
        </div>

        <div className="flex w-full justify-center overflow-hidden">
          <RevealLine delay={0.2} className="text-h1 text-center whitespace-nowrap">
            Adcker
          </RevealLine>
        </div>
      </h1>

      <div className="page-margin page-grid">
        <div className="col-span-10 col-start-2 flex flex-col items-center justify-center gap-y-[30px]">
          <RevealLine as="h2" className="text-h2 pt-2 text-center">
            Our story is built on a deep understanding of beauty, fashion, and
            wellness.
          </RevealLine>
          <p className="max-w-3xl text-center">
            This allows us to craft authentic, cohesive strategies that connect
            with your audience. With a keen eye on industry trends, we ensure
            your brand stays ahead of the curve.
          </p>
        </div>
      </div>

      <div className="page-margin page-grid">
        <div className="col-span-10 col-start-2 flex flex-col items-center justify-center gap-y-[30px]">
          <RevealLine as="h2" className="text-h2 pt-2 text-center">
            We specialize in creating hyper-targeted strategies unique to your
            brand.
          </RevealLine>
          <p className="max-w-3xl text-center">
            Leveraging our expertise to navigate the competitive landscape, we
            combine Gen Z insights with years of experience to guarantee
            engaging, impactful results for your brand.
          </p>
          <a href="/services" className="body-link">
            More about our services
          </a>
        </div>
      </div>

      <div className="page-margin flex flex-col gap-y-[50px]">
        <div className="page-grid">
          <div className="col-span-10 col-start-2 flex justify-center">
            <RevealLine as="h2" className="text-h2 pt-2 text-center">
              Meet the creative leaders behind Adcker
            </RevealLine>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-[15px] gap-y-[50px] md:grid-cols-2">
          {TEAM.map((person) => (
            <div key={person.num} className="flex flex-col gap-y-[15px]">
              <span className="text-note">( {person.num} )</span>
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-media-gray">
                <Image
                  src={person.image}
                  alt={person.name}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  unoptimized
                  className="object-cover"
                />
              </div>
              <div className="font-semibold">
                {person.name}
                {person.role && ` ${person.role}`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
