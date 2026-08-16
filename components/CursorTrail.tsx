"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The line the pointer leaves behind it, and then loses.
 *
 * Shabnam asked for this one by description: the mouse draws a black line as it
 * moves, and each part of that line disappears about a second after it was
 * drawn. So it is not a tail of fixed length trailing the cursor — the whole
 * path stays until it ages out, which is why a slow sweep leaves a long stroke
 * and a flick leaves a short one.
 *
 * A canvas rather than SVG or a run of divs. The line is a few hundred points
 * that all change opacity every frame; in the DOM that is a few hundred style
 * writes sixty times a second, and in a canvas it is one clear and one path.
 *
 * It draws in white and the canvas blends by difference — the site's own answer
 * to marks that cross both grounds, and the same one Menu and Back use. Over
 * the cream page white inverts to near-black, which is the black line she asked
 * for; over the footer and the photographs it stays light instead of vanishing
 * into them. A literal black stroke would have been invisible on every dark
 * section of the site.
 */

/**
 * How long a point survives after the pointer laid it down.
 *
 * Two seconds, up from the one it was built at — Shabnam's call after seeing
 * both. It is the whole character of the effect rather than a detail: at one
 * second the line is a tail that keeps pace with the hand, at two it is a mark
 * left on the page that then goes. The stroke a sweep across the window leaves
 * roughly doubles in length with it.
 */
const LIFETIME_MS = 2000;

/** The stroke, in CSS pixels. */
const WIDTH = 2;

/**
 * Points closer together than this are dropped.
 *
 * A pointer that has stopped still fires moves, and without this the array
 * fills with hundreds of identical points that all expire together — the line
 * develops a bright knot wherever the hand paused.
 */
const MIN_STEP = 2;

type Point = { x: number; y: number; t: number };

export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [enabled, setEnabled] = useState(false);

  /*
   * A trail is for a pointing device, not for a window width — the same test
   * CustomCursor makes, and watched rather than read once so that moving a
   * window between a trackpad screen and a touch one is picked up.
   *
   * Motion preference is part of the same question here. This effect is motion
   * and nothing else; asked for less of it, the honest answer is none.
   */
  useEffect(() => {
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setEnabled(pointer.matches && !motion.matches);
    sync();
    pointer.addEventListener("change", sync);
    motion.addEventListener("change", sync);
    return () => {
      pointer.removeEventListener("change", sync);
      motion.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!enabled || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let points: Point[] = [];
    let raf = 0;

    /*
     * The canvas is sized in device pixels and scaled back down, or the line is
     * drawn at half resolution on every retina screen and looks like a smudge.
     * Re-read on resize because the ratio changes when a window is dragged
     * between monitors, not only when one is plugged in.
     */
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();

    const onMove = (event: MouseEvent) => {
      const last = points[points.length - 1];
      if (last) {
        const dx = event.clientX - last.x;
        const dy = event.clientY - last.y;
        if (dx * dx + dy * dy < MIN_STEP * MIN_STEP) return;
      }
      points.push({ x: event.clientX, y: event.clientY, t: performance.now() });
    };

    /*
     * One segment at a time, each with its own alpha.
     *
     * Drawing the whole path once and fading it as a unit was the first attempt
     * and it is a different effect: the line then dies all at once wherever it
     * was drawn, instead of the old end dissolving while the new end is still
     * being laid down. Per-segment costs a stroke call each, which for a second
     * of movement is on the order of a hundred — nothing next to a frame.
     */
    const draw = () => {
      const now = performance.now();
      points = points.filter((point) => now - point.t < LIFETIME_MS);

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.lineWidth = WIDTH;
      context.lineCap = "round";
      context.lineJoin = "round";

      for (let i = 1; i < points.length; i++) {
        const from = points[i - 1];
        const to = points[i];
        // The younger of the two ends decides, so a segment does not start
        // fading before the point that finished it was even drawn.
        const age = (now - to.t) / LIFETIME_MS;
        context.strokeStyle = `rgba(255, 255, 255, ${1 - age})`;
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.stroke();
      }

      raf = requestAnimationFrame(draw);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    /*
     * Under the cursor's own dot and ring, which sit at the same z-index and
     * are rendered after this — the pointer should stay on top of the line it
     * is drawing. `pointer-events-none` because a full-screen canvas that took
     * clicks would swallow every one of them.
     */
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[999999998] mix-blend-difference"
    />
  );
}
