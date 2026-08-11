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
      const needed = row.scrollWidth;
      if (needed > available && available > 0) {
        el.style.fontSize = `${Math.max(min, Math.floor((max * available) / needed))}px`;
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
