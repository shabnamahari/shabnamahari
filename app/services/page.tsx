import type { Metadata } from "next";
import RevealLine from "@/components/RevealLine";
import Asterisk from "@/components/Asterisk";
import ParenMedia from "@/components/ParenMedia";
import VideoSlot from "@/components/VideoSlot";
import WorkEntry from "@/components/WorkEntry";
import { PROJECTS } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Programs — Shabnam Ahari",
  description:
    "Everyone starts on the same foundation. Nobody finishes on the same plan.",
};

export default function ServicesPage() {
  return (
    <div className="flex flex-col gap-y-[100px] pb-[100px] md:gap-y-[200px] md:pb-[200px]">
      <h1 className="flex min-h-[100svh] w-full flex-col items-center justify-center gap-y-2 overflow-hidden py-[15px]">
        <div className="flex w-full justify-center overflow-hidden">
          <RevealLine className="text-h1 text-center whitespace-nowrap">
            This is
          </RevealLine>
        </div>

        <div className="flex w-full justify-center overflow-hidden">
          <RevealLine
            delay={0.0667}
            className="text-h1 text-center whitespace-nowrap"
          >
            What
          </RevealLine>
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
              <VideoSlot label="Showreel" />
            </ParenMedia>
          </RevealLine>
          <span className="text-note absolute right-28 top-1/2 max-md:hidden -translate-y-1/2 translate-x-full pl-[1vw] md:pl-[1.5vw]">
            Find your fit
          </span>
        </div>

        <div className="flex w-full justify-center overflow-hidden">
          <RevealLine delay={0.2} className="text-h1 text-center whitespace-nowrap">
            You
          </RevealLine>
        </div>

        <div className="flex w-full justify-center overflow-hidden">
          <RevealLine delay={0.2667} className="text-h1 text-center whitespace-nowrap">
            Learn
          </RevealLine>
        </div>
      </h1>

      <div className="page-margin page-grid">
        <div className="col-span-10 col-start-2 flex flex-col items-center justify-center gap-y-[50px]">
          <RevealLine as="h2" className="text-h2 pt-2 text-center">
            Everyone starts on the same foundation. Nobody finishes on the
            same plan.
          </RevealLine>
        </div>
      </div>

      <div className="page-margin flex flex-col gap-y-[100px] md:gap-y-[200px]">
        {PROJECTS.map((project) => (
          <WorkEntry
            key={project.slug}
            name={project.name}
            image={project.cover}
            href={`/work/${project.slug}`}
          />
        ))}
      </div>
    </div>
  );
}
