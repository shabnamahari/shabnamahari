"use client";

import Image from "next/image";
import RevealLine from "./RevealLine";

const THUMBNAILS = [
  { num: "01", seed: "adcker-thumb-1" },
  { num: "02", seed: "adcker-thumb-2" },
  { num: "03", seed: "adcker-thumb-3" },
  { num: "04", seed: "adcker-thumb-4" },
  { num: "05", seed: "adcker-thumb-5" },
];

export default function Quote() {
  return (
    <section className="page-margin flex flex-col items-center gap-y-[50px] py-[60px] md:py-[100px]">
      <RevealLine as="h2" className="text-h2 max-w-5xl text-center">

        In a world where everyone is trying to do everything, we choose to
        specialize in the beauty, fashion, and wellness industries.
      </RevealLine>

      <a href="/about" className="body-link">
        More about us
      </a>

      <div className="flex w-full max-md:flex-col max-md:items-center justify-between gap-y-[50px] md:justify-center md:gap-x-[15px]">
        {THUMBNAILS.map((thumb) => (
          <div key={thumb.num} className="flex flex-col items-center gap-y-[15px]">
            <span className="text-note">( {thumb.num} )</span>
            <div className="relative aspect-[4/3] w-[218px] overflow-hidden bg-media-gray md:w-[150px] xl:w-[218px]">
              <Image
                src={`https://picsum.photos/seed/${thumb.seed}/600/450`}
                alt={`Work sample ${thumb.num}`}
                fill
                sizes="220px"
                unoptimized
                className="media-grayscale object-cover"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
