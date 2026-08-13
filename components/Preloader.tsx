"use client";

import { useEffect, useRef, useState } from "react";

import Asterisk from "./Asterisk";
import ParenMedia from "./ParenMedia";
import ShowReel from "./ShowReel";
import { getProject, reelImages } from "@/lib/projects";

/**
 * The count-in.
 *
 * Cream, empty, and one thing in the middle of it: the site's own ✳ ( media )
 * with a number climbing to 100 beside it, where the hero keeps its "Showreel".
 * When the number lands the screen lifts and the page is already there.
 *
 * The number is not theatre. It is pinned to two things that really happen —
 * the fonts arriving and the document finishing — and it will not print 100
 * before the second one, because a loader that lies is worse than none: it
 * hands over to a page that is still assembling itself.
 *
 * What it does add is a floor. Warm caches finish in eighty milliseconds, which
 * is a flash of cream and a number nobody read; the count is held to a little
 * under a second so the gesture is legible. That is the one place this is
 * generous rather than honest, and it costs a second once per visit.
 *
 * It renders on the server too, so the cream is in the first paint. If the
 * script never runs, the markup carries `data-preload` and a stylesheet rule
 * hides the overlay for anyone without JavaScript — nobody gets locked behind
 * a counter that cannot move.
 */

/** Never hand over sooner than this, in ms. */
const FLOOR_MS = 900;
/** And never hold on past this, whatever the browser says. */
const CEILING_MS = 8000;
/** How long the cream takes to lift once the number lands. */
const LIFT_MS = 700;

export default function Preloader() {
  const [pct, setPct] = useState(0);
  const [lifting, setLifting] = useState(false);
  const [gone, setGone] = useState(false);
  const finished = useRef(false);

  useEffect(() => {
    const lenis = window.__lenis;
    // The overlay covers the page, but a wheel under it still scrolls, so the
    // handover would land you halfway down a page you have not seen yet.
    lenis?.stop();
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";

    let target = 8; // something is always happening
    let shown = 0;
    let frame = 0;
    const started = performance.now();

    const bump = (to: number) => {
      target = Math.max(target, to);
    };

    document.fonts?.ready.then(() => bump(55));

    const onLoad = () => bump(100);
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    const giveUp = window.setTimeout(() => bump(100), CEILING_MS);

    const release = () => {
      if (finished.current) return;
      finished.current = true;
      setPct(100);
      setLifting(true);
      window.setTimeout(() => {
        root.style.overflow = previous;
        lenis?.start();
        setGone(true);
      }, LIFT_MS);
    };

    const tick = () => {
      const elapsed = performance.now() - started;
      // 99 until the floor is cleared: the number may approach the end early,
      // it may not arrive there.
      const ceiling = elapsed < FLOOR_MS ? 99 : 100;
      const reach = Math.min(target, ceiling);

      const step = (reach - shown) * 0.08;
      // A minimum step as well as an eased one, so the last few never crawl.
      if (step > 0) shown += Math.max(step, 0.4);

      if (shown >= 99.6 && reach === 100) {
        release();
        return;
      }

      setPct(Math.floor(shown));
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(giveUp);
      window.removeEventListener("load", onLoad);
      root.style.overflow = previous;
      lenis?.start();
    };
  }, []);

  if (gone) return null;

  const ielts = getProject("ielts");

  return (
    <div
      data-preload
      aria-hidden
      // Above the header's z-[999999999]: the loader is the only thing on
      // screen, and Menu showing through it would be a second way in.
      className="bg-cream fixed inset-0 z-[1000000000] flex items-center justify-center"
      style={{
        opacity: lifting ? 0 : 1,
        transition: `opacity ${LIFT_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      }}
    >
      {/* The hero's own row, at the hero's own size — this is the same object
          the page opens on, which is what makes the handover read as one
          movement rather than two screens. */}
      <div className="relative flex shrink-0 items-center px-16 md:px-28">
        <span className="text-ink absolute left-16 w-[calc((0.9em+2.7vw)*1.5)] -translate-x-full pt-1 max-md:w-10 md:left-24">
          <Asterisk />
        </span>

        <span className="text-h1 flex items-center justify-center font-bold">
          <ParenMedia>
            {ielts ? (
              <ShowReel
                images={reelImages(ielts)}
                beat={0.7}
                alt=""
              />
            ) : null}
          </ParenMedia>
        </span>

        <span
          className="font-nhm absolute top-1/2 right-28 -translate-y-1/2 translate-x-full pl-[1vw] text-[1.375rem] font-bold tabular-nums max-md:hidden md:pl-[1.5vw]"
          // Announced nowhere: the whole overlay is aria-hidden, and a screen
          // reader has the page underneath already.
        >
          {pct}%
        </span>
      </div>
    </div>
  );
}
