"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** Where the visitor came from, stashed by the link that sent them here. */
export const BACK_KEY = "back-to";

export type BackOrigin = { href: string; label: string };

/**
 * brackets — the parentheses clamp onto the word, against Menu's opening
 *   around it.
 * arrow    — an arrow is drawn out to the left, its length following the
 *   pointer.
 * slide    — the word leaves to the left on the click that navigates.
 *
 * Switchable from the URL while these are being chosen between: /auth?fx=arrow.
 */
export type BackVariant = "brackets" | "arrow" | "slide";

/** How far left the arrow can be drawn, and how long the exit takes. */
const ARROW_MAX_EM = 3.4;
const SLIDE_MS = 420;

function useOrigin(): BackOrigin | null {
  // Read as an external store rather than in an effect: the server has no
  // sessionStorage, so the note can only appear once the client takes over, and
  // this is the sanctioned way to say that. Nothing writes the key while this
  // page is mounted, so there is nothing to subscribe to.
  const stored = useSyncExternalStore(
    () => () => {},
    () => sessionStorage.getItem(BACK_KEY),
    () => null,
  );

  return useMemo(() => {
    if (!stored) return null;
    try {
      return JSON.parse(stored) as BackOrigin;
    } catch {
      // A malformed store just means no note; the control still works.
      return null;
    }
  }, [stored]);
}

export default function BackControl({ label = "Back" }: { label?: string }) {
  const router = useRouter();
  const origin = useOrigin();
  const variant = (useSearchParams().get("fx") ?? "brackets") as BackVariant;

  const [pull, setPull] = useState(0); // 0 at the word, 1 fully drawn out
  const [isLeaving, setIsLeaving] = useState(false);
  const frame = useRef<number | null>(null);

  // Following the stored href is truer than history: it lands on the entry that
  // sent you here even if you have since navigated within this page. History is
  // the fallback for anyone who arrived at this URL directly.
  const navigate = () => {
    if (origin) router.push(origin.href);
    else router.back();
  };

  const goBack = () => {
    const stillMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (variant !== "slide" || stillMotion.matches) {
      navigate();
      return;
    }
    setIsLeaving(true);
    window.setTimeout(navigate, SLIDE_MS);
  };

  // The pointer's distance from the right edge of the control, as a fraction of
  // its width. Read on a frame rather than per event, so a fast sweep across
  // the word cannot queue up a hundred renders.
  const trackPointer = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (variant !== "arrow") return;
    const box = event.currentTarget.getBoundingClientRect();
    const fraction = 1 - (event.clientX - box.left) / box.width;
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      setPull(Math.min(1, Math.max(0, fraction)));
    });
  };

  const isBrackets = variant === "brackets";

  return (
    <div className="fixed top-[38px] right-0 z-[999999999] flex w-full items-center justify-end px-[15px] text-white mix-blend-difference">
      <button
        type="button"
        onClick={goBack}
        onPointerMove={trackPointer}
        onPointerLeave={() => setPull(0)}
        style={{
          transform: isLeaving ? "translateX(-1.5rem)" : undefined,
          opacity: isLeaving ? 0 : undefined,
          transition: isLeaving
            ? `transform ${SLIDE_MS}ms cubic-bezier(0.82,0,0.18,1), opacity ${SLIDE_MS}ms cubic-bezier(0.82,0,0.18,1)`
            : undefined,
        }}
        className="group relative text-sm font-semibold tracking-wide uppercase"
      >
        {origin ? (
          <span
            // Clear of the arrow's reach, so the two never sit on top of
            // each other while the arrow is fully drawn.
            style={{ marginRight: variant === "arrow" ? `${ARROW_MAX_EM}em` : 0 }}
            className="ease-custom-less absolute top-1/2 right-full translate-x-2 -translate-y-1/2 pr-4 text-sm font-normal tracking-normal whitespace-nowrap normal-case opacity-0 transition-all duration-700 group-hover:translate-x-0 group-hover:opacity-100"
          >
            {origin.label}
          </span>
        ) : null}

        {variant === "arrow" ? (
          // Drawn, not moved: the shaft scales from its right end so it grows
          // out of the word, and the head rides the tip. Both are driven off
          // the same `pull`, so they cannot come apart.
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-full flex -translate-y-1/2 items-center pr-[0.5em]"
            style={{ width: `${ARROW_MAX_EM}em`, opacity: pull > 0.02 ? 1 : 0 }}
          >
            <span
              className="block h-px w-full origin-right bg-current"
              style={{ transform: `scaleX(${pull})` }}
            />
            <span
              className="absolute block h-[0.45em] w-[0.45em] rotate-45 border-b border-l border-current"
              style={{
                left: `calc(${ARROW_MAX_EM}em - 0.5em - ${pull} * (${ARROW_MAX_EM}em - 0.5em))`,
              }}
            />
          </span>
        ) : null}

        <span
          className={`ease-custom-less inline-block transition-transform duration-700 ${
            isBrackets ? "group-hover:translate-x-[0.35em]" : ""
          }`}
        >
          (
        </span>
        <span className="px-[0.35em]">{label}</span>
        <span
          className={`ease-custom-less inline-block transition-transform duration-700 ${
            isBrackets ? "group-hover:-translate-x-[0.35em]" : ""
          }`}
        >
          )
        </span>
      </button>
    </div>
  );
}
