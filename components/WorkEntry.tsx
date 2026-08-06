"use client";

import Asterisk from "./Asterisk";
import KineticTypeTile from "./KineticTypeTile";

export default function WorkEntry({
  name,
  lines,
  tone,
  size,
  href = "#",
}: {
  name: string;
  /** The word as the tile sets it, one entry per line. */
  lines: string[];
  tone: number;
  /** Tuned per word: these boxes are wide, not square like the homepage. */
  size: string;
  href?: string;
}) {
  return (
    <div className="page-grid">
      <a
        href={href}
        /* The tile is decorative to a screen reader, and the caption under it
           is gone, so the link carries the name itself. */
        aria-label={name}
        className="group col-span-8 col-start-3 flex flex-col justify-center gap-y-[30px] lg:col-span-6 lg:col-start-4"
      >
        <div className="relative">
          <span className="absolute top-1/2 -left-[16vw] w-[calc((0.9em+2.7vw)*1)] -translate-y-1/2 text-ink sm:-left-[14vw] lg:w-[calc((0.9em+2.7vw)*1.5)] xl:-left-[13vw]">
            <Asterisk />
          </span>
          <div className="text-h1 flex items-center justify-center gap-x-[calc(0.1em+1vw)] p-0 font-nhm font-bold">
            <span className="absolute top-1/2 -left-[8vw] -translate-y-1/2 -scale-x-100 text-center lg:-left-[6vw]">
              )
            </span>
            <div className="relative aspect-[727/408] w-full overflow-hidden bg-media-gray">
              <KineticTypeTile
                lines={lines}
                size={size}
                tone={tone}
                duration={5.4}
              />
            </div>
            <span className="absolute top-1/2 -right-[8vw] -translate-y-1/2 text-center lg:-right-[6vw]">
              )
            </span>
          </div>
        </div>
      </a>
    </div>
  );
}
