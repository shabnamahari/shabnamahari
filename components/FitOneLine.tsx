"use client";

import { useEffect, useRef } from "react";

/**
 * Shrinks its contents until they fit on one line, and no further.
 *
 * The alternative was to estimate how wide a character renders and derive a
 * size from the character count, which is what the entry titles do. That works
 * there because the worst case is one known word; here the row is five titles
 * whose combined length differs per program, and an estimate that is wrong by
 * a few percent either clips a title or shrinks the row for nothing. The
 * browser already knows the real width, so it is asked.
 */
export default function FitOneLine({
  children,
  max,
  min,
  className = "",
}: {
  children: React.ReactNode;
  /** Type size when everything fits, in px. */
  max: number;
  /** Never shrink past this, in px — below it the row is unreadable anyway. */
  min: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const row = el?.firstElementChild;
    if (!el || !row) return;

    const fit = () => {
      // Measured from the top each time rather than adjusted from wherever the
      // last pass left it, so widening the window grows the row back.
      el.style.fontSize = `${max}px`;
      const available = el.clientWidth;
      if (available <= 0 || row.scrollWidth <= available) return;

      // Estimate, then check. Width is not quite linear in font size —
      // letter-spacing does not scale with it and every glyph advance is
      // rounded — so the ratio lands a hair wide. On the AI & IELTS page,
      // whose row is the five longest titles in the program, one pass left it
      // ten pixels over and `overflow: hidden` sliced a word off each end.
      let size = Math.max(min, Math.floor((max * available) / row.scrollWidth));
      el.style.fontSize = `${size}px`;

      while (size > min && row.scrollWidth > available) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [max, min]);

  return (
    <div ref={ref} className={`w-full overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
