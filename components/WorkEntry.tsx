"use client";

import Image from "next/image";
import Asterisk from "./Asterisk";
import RevealLine from "./RevealLine";

export default function WorkEntry({
  name,
  image,
  href = "#",
}: {
  name: string;
  image: string;
  href?: string;
}) {
  return (
    <div className="page-grid">
      <a
        href={href}
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
            <div className="relative aspect-[727/408] w-full overflow-hidden bg-media-gray grayscale transition-all duration-500 group-hover:grayscale-0">
              <Image
                src={image}
                alt={name}
                fill
                sizes="(min-width: 1024px) 50vw, 66vw"
                unoptimized
                className="object-cover"
              />
            </div>
            <span className="absolute top-1/2 -right-[8vw] -translate-y-1/2 text-center lg:-right-[6vw]">
              )
            </span>
          </div>
        </div>
        <RevealLine as="h2" className="text-h2 text-center">
          {name}
        </RevealLine>
      </a>
    </div>
  );
}
