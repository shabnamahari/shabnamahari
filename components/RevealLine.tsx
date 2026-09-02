"use client";

import { useEffect, useRef } from "react";

export default function RevealLine({
  children,
  delay = 0,
  duration,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  /**
   * Seconds, when this line should not take the stack's second.
   *
   * Left off, nothing is written and the 1s in globals.css stands — which is
   * every caller but the hero's coral block, where four lines answering the
   * headline have to finish inside the time the headline itself takes.
   */
  duration?: number;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const Wrapper = Tag as React.ElementType;

  return (
    <Wrapper ref={ref} className={`reveal-line ${className}`}>
      <span
        className="reveal-inner"
        style={{
          transitionDelay: `${delay}s`,
          ...(duration === undefined
            ? null
            : { transitionDuration: `${duration}s` }),
        }}
      >
        {children}
      </span>
    </Wrapper>
  );
}
