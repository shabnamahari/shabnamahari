import type { Metadata } from "next";
import RevealLine from "@/components/RevealLine";
import { learnHref } from "@/lib/routes";
import Asterisk from "@/components/Asterisk";
import ParenMedia from "@/components/ParenMedia";
import ShowReel from "@/components/ShowReel";
import KineticTypeTile from "@/components/KineticTypeTile";
import WorkEntry from "@/components/WorkEntry";
import { PROJECTS } from "@/lib/projects";

export const metadata: Metadata = {
  // "Learn", not "Programs". Programs are the six entries inside IELTS; this
  // page holds all three sections, whose entries are Programs, Insights and
  // Areas. It was the fourth name for one thing, and the menu, the heading, the
  // Back control and the address all say Learn.
  title: "Learn — Shabnam Ahari",
  description:
    "Everyone starts on the same foundation. Nobody finishes on the same plan.",
};

// These boxes are wide rather than square, so the type is sized off the box
// height and needs its own values — the homepage ones would read far too small.
// These boxes are wide rather than square, so the type is sized off the box
// height and needs its own values — the homepage ones would read far too small.
// At these sizes the second copy runs wider than the box and gets clipped at
// the edges, which is the approved look.
// The hero slot is a small square; the blocks below it are wide. Same tiles,
// different type sizes.
const HERO_TILE_SIZES: Record<string, string> = {
  ielts: "23cqmin",
  blogcasts: "18cqmin",
  "business-english": "12.5cqmin",
};

const TILE_SIZES: Record<string, string> = {
  ielts: "34cqmin",
  blogcasts: "25cqmin",
  "business-english": "19cqmin",
};

export default function ServicesPage() {
  return (
    <div className="flex flex-col gap-y-step-4 pb-step-4 md:gap-y-step-5 md:pb-step-5">
      {/* Five lines — "This is" was starting underneath the assistant's bar. */}
      <h1 className="hero-stack">
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

        <div className="relative flex shrink-0 items-center px-16 md:px-28">
          <span className="absolute left-16 md:left-24 w-[calc((0.9em+2.7vw)*1.5)] max-md:w-10 -translate-x-full pt-1 text-ink">
            <Asterisk />
          </span>
          <RevealLine
            delay={0.133}
            className="text-h1 flex items-center justify-center font-bold"
          >
            <ParenMedia>
              <ShowReel
                beat={0.5}
                alt="The three Programs"
                frames={PROJECTS.map((project) => (
                  <KineticTypeTile
                    key={project.slug}
                    {...project.tile}
                    size={HERO_TILE_SIZES[project.slug]}
                    sound={false}
                  />
                ))}
              />
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
        <div className="col-span-10 col-start-2 flex flex-col items-center justify-center gap-y-step-2">
          <RevealLine as="h2" className="text-h2 pt-2 text-center">
            Everyone starts on the same foundation. Nobody finishes on the
            same plan.
          </RevealLine>
        </div>
      </div>

      <div className="page-margin flex flex-col gap-y-step-4 md:gap-y-step-5">
        {PROJECTS.map((project) => (
          <WorkEntry
            key={project.slug}
            name={project.name}
            lines={project.tile.lines}
            tone={project.tile.tone}
            size={TILE_SIZES[project.slug]}
            href={learnHref(project.slug)}
          />
        ))}
      </div>
    </div>
  );
}
