"use client";

import { useEffect, useRef } from "react";

export default function RevealLine({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
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
        style={{ transitionDelay: `${delay}s` }}
      >
        {children}
      </span>
    </Wrapper>
  );
}
