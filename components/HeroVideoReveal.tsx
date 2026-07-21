"use client";

import { useEffect, useRef, useState } from "react";
import VideoSlot from "./VideoSlot";

/**
 * The widescreen video that grows out of the bottom of the viewport as you
 * scroll past the hero, mirroring adcker's `heroWithVideo`: a fixed, full-width
 * box whose height tracks scroll up to a 16:9 max, then drops into normal flow.
 * The spacer reserves that height in the document until the box takes over.
 */
export default function HeroVideoReveal({ src }: { src?: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let maxHeight = (window.innerWidth - 30) / (16 / 9);
    let raf = 0;

    const apply = () => {
      const clamped = Math.min(Math.max(window.scrollY, 0), maxHeight);
      wrapper.style.height = `${clamped}px`;
      setIsOpen(clamped >= maxHeight);
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };

    const onResize = () => {
      maxHeight = (window.innerWidth - 30) / (16 / 9);
      apply();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    apply();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div
        ref={wrapperRef}
        className={`${
          isOpen ? "relative" : "fixed"
        } bottom-0 left-0 h-0 w-full max-w-[100vw] overflow-hidden will-change-transform`}
      >
        <div className="absolute bottom-0 left-1/2 aspect-video h-full w-auto -translate-x-1/2">
          <VideoSlot src={src} label="Showreel" />
        </div>
      </div>
      <div className={`aspect-video w-full ${isOpen ? "hidden" : ""}`} />
    </>
  );
}
