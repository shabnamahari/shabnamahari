import Image from "next/image";
import RevealLine from "./RevealLine";
import ParenMedia from "./ParenMedia";
import { HOMEPAGE_LINKS } from "@/lib/projects";

const IMAGES = {
  beauty: "https://picsum.photos/seed/adcker-beauty/800/800",
  fashion: "https://picsum.photos/seed/adcker-fashion/800/800",
  wellness: "https://picsum.photos/seed/adcker-wellness/800/800",
};

function ServiceMedia({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="200px"
      className="object-cover"
      unoptimized
    />
  );
}

export default function Services() {
  return (
    <section className="page-margin flex flex-col items-center gap-y-2 py-[100px] md:py-[200px]">
      <div className="relative flex w-full justify-center overflow-hidden">
        <RevealLine className="text-h1-2 text-center whitespace-nowrap">
          For
        </RevealLine>
        <span
          className="text-note absolute left-4 top-1/2 max-lg:hidden -translate-x-full -translate-y-1/2"
          style={{ marginLeft: "-1.5vw" }}
        >
          Our services
        </span>
      </div>

      <div className="relative flex w-full flex-wrap items-center justify-center gap-x-[2vw] overflow-hidden">
        <RevealLine
          delay={0.0667}
          className="text-h1-2 flex items-center whitespace-nowrap"
        >
          <span className="inline-flex items-center gap-x-[2vw]">
            IELTS
            <ParenMedia href={HOMEPAGE_LINKS.ielts} label="IELTS">
              <ServiceMedia src={IMAGES.beauty} alt="IELTS" />
            </ParenMedia>
          </span>
        </RevealLine>
        <span
          className="text-note absolute right-0 top-1/2 max-lg:hidden -translate-y-1/2 translate-x-full"
          style={{ marginRight: "-1.5vw" }}
        >
          Click me
        </span>
      </div>

      <div className="flex w-full justify-center overflow-hidden">
        <RevealLine delay={0.133} className="text-h1-2 text-center whitespace-nowrap">
          Blogposts
        </RevealLine>
      </div>

      <div className="relative flex w-full flex-wrap items-center justify-center gap-x-[2vw] overflow-hidden">
        <span
          className="text-note absolute left-4 top-1/2 max-lg:hidden -translate-x-full -translate-y-1/2"
          style={{ marginLeft: "-2.5vw" }}
        >
          Click me
        </span>
        <RevealLine
          delay={0.2}
          className="text-h1-2 flex items-center whitespace-nowrap"
        >
          <span className="inline-flex items-center gap-x-[2vw]">
            <ParenMedia href={HOMEPAGE_LINKS.blogposts} label="Blogposts">
              <ServiceMedia src={IMAGES.fashion} alt="Blogposts" />
            </ParenMedia>
            and
          </span>
        </RevealLine>
      </div>

      <div className="flex w-full justify-center overflow-hidden">
        <RevealLine
          delay={0.2667}
          className="text-h1-2 text-center whitespace-nowrap"
        >
          <span style={{ fontSize: "calc((100vw - 44px) / 8.55)" }}>
            Business English
          </span>
        </RevealLine>
      </div>

      <div className="relative flex w-full justify-center overflow-hidden">
        <RevealLine delay={0.333} className="text-h1-2 flex items-center justify-center">
          <ParenMedia href={HOMEPAGE_LINKS.businessEnglish} label="Business English">
            <ServiceMedia src={IMAGES.wellness} alt="Business English" />
          </ParenMedia>
        </RevealLine>
        <span
          className="text-note absolute right-0 top-1/2 max-lg:hidden -translate-y-1/2 translate-x-full"
          style={{ marginRight: "-1.5vw" }}
        >
          Click me
        </span>
      </div>
    </section>
  );
}
