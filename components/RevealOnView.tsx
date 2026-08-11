"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Arms the gallery-caption entrance on scroll.
 *
 * TitleEffects keys off an ancestor's `data-active`, which the hover-expand
 * panels set the moment they open. A row that just sits on the page has no
 * such moment, so the flag is thrown when it scrolls into view instead — once,
 * like RevealLine, since a title that re-animated every time it passed the
 * fold would read as a fault rather than an entrance.
 */
export default function RevealOnView({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}) {
  const ref = useRef<HTMLElement>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsActive(true);
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
    <Wrapper ref={ref} data-active={String(isActive)} className={className}>
      {children}
    </Wrapper>
  );
}
