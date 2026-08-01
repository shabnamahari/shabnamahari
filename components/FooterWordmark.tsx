"use client";

import { useEffect, useRef, useState } from "react";

const LETTERS = ["i", "e", "l", "t", "s", "."];

function scrollToTop() {
  if (typeof window === "undefined") return;
  if (window.__lenis) {
    window.__lenis.scrollTo(0, { duration: 1 });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

/**
 * Big "ielts." back-to-top wordmark. Each letter slides up with a 50ms
 * stagger once it scrolls into view — same motion adcker drives with anime.js.
 */
export default function FooterWordmark() {
  const ref = useRef<HTMLButtonElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return (
    <button
      ref={ref}
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      /* Negative inline margin cancels the footer's 15px padding so the
         wordmark reaches both edges, like the original. */
      className="-mx-[15px] block w-[calc(100%+30px)] overflow-hidden text-center text-confirm"
    >
      {/* Glyph size + inter-letter gap are tuned together so "ielts." sums
          to a safe margin under the viewport width — recalculate both if
          the text or weight changes (sum the letters' widths plus gaps;
          they are separate flex-item spans for the stagger, so the kerned
          string is not the right measure). Sized well under 100% on
          purpose: 100vw can exceed the visible viewport when a scrollbar
          is present, so a razor-thin fit clips on some browsers/screens.
          The gap is flex `gap`, not letter-spacing — these are discrete
          flex items, not a text run, so letter-spacing has no effect here.
          leading-1 keeps the glyphs from being clipped vertically, and the
          negative bottom margin trims the empty space under them —
          0.165em is the most that can come off before it starts cutting
          into the baseline. */}
      <span className="-mb-[0.165em] flex w-full justify-center gap-x-[3vw] font-psl text-[48vw] leading-[1] lowercase italic">
        {LETTERS.map((letter, i) => (
          <span key={i} className="block overflow-hidden pb-[0.04em]">
            <span
              className="block transition-transform duration-1000"
              style={{
                transitionTimingFunction: "cubic-bezier(0.85, 0, 0.25, 1)",
                transitionDelay: `${i * 0.05}s`,
                transform: isVisible ? "translateY(0)" : "translateY(105%)",
              }}
            >
              {letter}
            </span>
          </span>
        ))}
      </span>
    </button>
  );
}
