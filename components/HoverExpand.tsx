"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { TextRevealH } from "@/components/TitleEffects";

export type HoverExpandImage = {
  href: string;
  src: string;
  alt: string;
  /** The small label in the corner of the open panel — skiper sets it "# 01". */
  code: string;
  /** Shown beside the panel, centred against it. */
  title: string;
  /** Optional second line under the title, in muted ink. */
  roles?: string;
  /**
   * An animated cut of `src` — the same artwork with the figures in it moving.
   * Plays only while the panel is open; `src` stays the poster underneath, so a
   * category without a clip yet simply shows the still and nothing breaks.
   */
  video?: string;
};

/**
 * Skiper UI's skiper53 / HoverExpand_002, ported to this site.
 *
 * A stack of strips in one centred column; hovering one opens it while the rest
 * close, and its title reveals itself alongside. One panel is always open — the
 * second, on load — so the stack never sits fully collapsed.
 *
 * The original drives the height, the scrim and the label with framer-motion.
 * Every one of those is a single tween, so they are CSS transitions here at the
 * same 0.3s ease-in-out; the site carries no animation library and this needed
 * no reason to be the first.
 *
 * Original: https://skiper-ui.com/v1/skiper53 (@gurvinder-singh02, Skiper UI)
 */
export default function HoverExpand({
  images,
  entry = "none",
  className = "",
}: {
  images: HoverExpandImage[];
  /** skiper53 fades the whole block up 20px, half a second after it mounts. */
  entry?: "none" | "load";
  className?: string;
}) {
  const [activeImage, setActiveImage] = useState(1);

  return (
    <div data-entry={entry} className={`hover-expand ${className}`}>
      {images.map((image, index) => {
        const isActive = activeImage === index;

        return (
          <div
            key={image.href}
            data-active={isActive}
            className="hover-expand-row"
          >
            <Link
              href={image.href}
              className="hover-expand-panel"
              // On the image itself, as skiper has it — not on the row. The row
              // runs the full width of the page, so hovering it would open a
              // panel from way out in the margin beside the title.
              onMouseEnter={() => setActiveImage(index)}
              // Tabbing opens each panel in turn, so Enter follows the one you
              // can actually see.
              onFocus={() => setActiveImage(index)}
              // Without a pointer there is no hover to open a strip with, so
              // the first tap opens it and only the second follows the link.
              onClick={(e) => {
                if (!isActive) {
                  e.preventDefault();
                  setActiveImage(index);
                }
              }}
            >
              <div
                className={`absolute h-full w-full bg-gradient-to-t from-black/50 to-transparent transition-opacity duration-300 ${
                  isActive ? "opacity-100" : "opacity-0"
                }`}
              />

              <div
                className={`absolute flex h-full w-full flex-col items-end justify-end px-4 pb-5 transition-all duration-300 ${
                  isActive
                    ? "translate-y-0 opacity-100"
                    : "translate-y-5 opacity-0"
                }`}
              >
                <p className="text-left text-xs text-white/50">{image.code}</p>
              </div>

              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(min-width: 768px) 47vh, 62vw"
                unoptimized
                className="size-full object-cover"
              />

              {/*
                Mounted only while the panel is open, which is what keeps the
                other five clips off the wire — a closed strip is two dozen
                pixels tall and has nothing to show a video in anyway. Closing
                unmounts it, so playback and any in-flight download stop with
                it.

                The still above stays put underneath and acts as the poster:
                between the panel opening and the first frame decoding there is
                artwork in the frame, not a black rectangle.
              */}
              {image.video && isActive && (
                <video
                  src={image.video}
                  autoPlay
                  loop
                  // Muted is not a preference here — without it the browser
                  // refuses to autoplay at all.
                  muted
                  playsInline
                  className="hover-expand-clip absolute inset-0 size-full object-cover"
                />
              )}
            </Link>

            <div className="hover-expand-title text-note">
              <TextRevealH text={image.title} />
              {/* Only the open row has the height to carry a role list; on a
                  closed strip they would run over the titles either side. */}
              {image.roles && isActive && (
                <span className="hover-expand-roles text-muted-ink">
                  <TextRevealH
                    text={`(${image.roles})`}
                    // Picks up where the title left off, so the two lines are
                    // one wave running down the block, not two racing each other.
                    startIndex={image.title.split(" ").length}
                  />
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
