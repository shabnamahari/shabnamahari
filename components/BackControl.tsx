"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

/** Where the visitor came from, stashed by the link that sent them here. */
export const BACK_KEY = "back-to";

export type BackOrigin = { href: string; label: string };

/**
 * How long the word takes to leave, and how far it goes.
 *
 * Both were raised from a first pass that nobody could see: at 420ms over
 * 1.5rem the word was gone before the eye found it, which read as a jump
 * rather than a departure. The curve accelerates away rather than easing to a
 * stop, so the motion is still leaving the screen when the next page arrives —
 * that is what keeps two thirds of a second from feeling like a wait.
 */
const SLIDE_MS = 620;
const SLIDE_DISTANCE = "-3.5rem";
const SLIDE_CURVE = "cubic-bezier(0.4, 0, 0.9, 1)";

/**
 * The brackets closing on the word.
 *
 * `translate` rather than `transform`, because Tailwind v4's translate
 * utilities write the standalone translate property — transition-transform
 * names something that never changes here, and the brackets would sit still.
 */
const CLAMP = "translate 700ms cubic-bezier(0.82, 0, 0.18, 1)";

/**
 * Sits directly under the header's Menu, in the same type and the same blend
 * mode, so the two read as one stack rather than a button that wandered in.
 *
 * Three things happen here, each borrowed from something the site already does:
 *
 * The brackets clamp onto the word on hover, against Menu's, which open around
 * it — one gesture run in two directions, so the pair reads as a system.
 *
 * The destination slides in from the left, the way the menu overlay's notes do.
 * That one is not decoration: a control that walks history cannot otherwise say
 * where it lands, and this page is reachable from any of the eighteen entries.
 *
 * And on the click, the word leaves to the left before the page does.
 */
export default function BackControl({ label = "Back" }: { label?: string }) {
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);

  // Read as an external store rather than in an effect: the server has no
  // sessionStorage, so the note can only appear once the client takes over, and
  // this is the sanctioned way to say that. Nothing writes the key while this
  // page is mounted, so there is nothing to subscribe to.
  const stored = useSyncExternalStore(
    () => () => {},
    () => sessionStorage.getItem(BACK_KEY),
    () => null,
  );

  const origin = useMemo<BackOrigin | null>(() => {
    if (!stored) return null;
    try {
      return JSON.parse(stored) as BackOrigin;
    } catch {
      // A malformed store just means no note; the control still works.
      return null;
    }
  }, [stored]);

  // Following the stored href is truer than history: it lands on the entry that
  // sent you here even if you have since navigated within this page. History is
  // the fallback for anyone who arrived at this URL directly.
  const navigate = () => {
    if (origin) router.push(origin.href);
    else router.back();
  };

  const goBack = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      navigate();
      return;
    }
    setIsLeaving(true);
    window.setTimeout(navigate, SLIDE_MS);
  };

  return (
    <div className="fixed top-[38px] right-0 z-[999999999] flex w-full items-center justify-end px-[15px] text-white mix-blend-difference">
      <button
        type="button"
        onClick={goBack}
        style={{
          transform: isLeaving ? `translateX(${SLIDE_DISTANCE})` : undefined,
          opacity: isLeaving ? 0 : undefined,
          transition: `transform ${SLIDE_MS}ms ${SLIDE_CURVE}, opacity ${SLIDE_MS}ms ${SLIDE_CURVE}`,
        }}
        className="group relative text-sm font-semibold tracking-wide uppercase"
      >
        {origin ? (
          <span className="ease-custom-less absolute top-1/2 right-full translate-x-2 -translate-y-1/2 pr-4 text-sm font-normal tracking-normal whitespace-nowrap normal-case opacity-0 transition-all duration-700 group-hover:translate-x-0 group-hover:opacity-100">
            {origin.label}
          </span>
        ) : null}
        <span
          style={{ transition: CLAMP }}
          className="inline-block group-hover:translate-x-[0.35em]"
        >
          (
        </span>
        <span className="px-[0.35em]">{label}</span>
        <span
          style={{ transition: CLAMP }}
          className="inline-block group-hover:-translate-x-[0.35em]"
        >
          )
        </span>
      </button>
    </div>
  );
}
