"use client";

import { useEffect, useRef, useState } from "react";

const LETTERS = ["a", "d", "k", "r", "."];

function scrollToTop() {
  if (typeof window === "undefined") return;
  if (window.__lenis) {
    window.__lenis.scrollTo(0, { duration: 1 });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

/**
 * Big "adkr." back-to-top wordmark. Each letter slides up with a 50ms stagger
 * once it scrolls into view — same motion adcker drives with anime.js.
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
      className="-mx-[15px] block w-[calc(100%+30px)] overflow-hidden text-center text-cream"
    >
      {/* Size is tuned so the letter boxes add up to the viewport width —
          recalculate it if the text or weight changes (sum the letters' widths;
          they are separate spans for the stagger, so the kerned string is not
          the right measure). Tracking is left at normal deliberately: negative
          tracking pushes glyph ink outside its own box, which the per-letter
          overflow clip then shaves off. leading-1 keeps the glyphs from being
          clipped vertically, and the negative bottom margin trims the empty
          space under them — 0.165em is the most that can come off before it
          starts cutting into the baseline. */}
      <span className="-mb-[0.165em] flex w-full justify-center font-kumbh text-[41.3vw] leading-[1] font-bold lowercase">
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
