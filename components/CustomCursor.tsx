"use client";

import { useEffect, useRef, useState } from "react";

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [hasMouse, setHasMouse] = useState(false);

  /*
   * Whether to draw a cursor is a question about the pointing device, not the
   * width of the window: at half screen on a laptop the old width test said no
   * and the real cursor was hidden by then anyway, leaving nothing at all.
   * Watched rather than read once, so dragging a window between a trackpad
   * screen and a touch one is picked up.
   */
  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setHasMouse(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!hasMouse) return;

    const ring = { x: 0, y: 0 };
    let raf = 0;

    let ringX = 0;
    let ringY = 0;
    let scale = 1;

    function onMove(e: MouseEvent) {
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      }
      ring.x = e.clientX;
      ring.y = e.clientY;
    }

    function loop() {
      ringX += (ring.x - ringX) * 0.15;
      ringY += (ring.y - ringY) * 0.15;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${scale})`;
      }
      raf = requestAnimationFrame(loop);
    }

    function onDown() {
      scale = 0.75;
    }
    function onUp() {
      scale = 1;
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      cancelAnimationFrame(raf);
    };
  }, [hasMouse]);

  if (!hasMouse) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[999999999]">
      {/* Solid accent, no blend mode: difference blending against the site's own
          near-black made the cursor cancel out to nothing on dark sections. */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-1.5 h-1.5 rounded-full bg-cursor"
      />
      <div
        ref={ringRef}
        className="fixed top-0 left-0 w-8 h-8 rounded-full border border-cursor"
      />
    </div>
  );
}
