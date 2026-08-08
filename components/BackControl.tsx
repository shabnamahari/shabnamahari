"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

/** Where the visitor came from, stashed by the link that sent them here. */
export const BACK_KEY = "back-to";

export type BackOrigin = { href: string; label: string };

/**
 * Sits directly under the header's Menu, in the same type and the same blend
 * mode, so the two read as one stack rather than a button that wandered in.
 *
 * Two effects, both borrowed from things the site already does:
 *
 * The brackets clamp onto the word on hover — the counterpart of Menu's, which
 * open around it. One gesture, run in two directions, so the pair reads as a
 * system.
 *
 * And the destination slides in from the left, the way the menu overlay's notes
 * do. That one is not decoration: a control that goes back through history
 * cannot otherwise say where it lands, and this page is reachable from any of
 * the eighteen entries.
 */
export default function BackControl({ label = "Back" }: { label?: string }) {
  const router = useRouter();

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
  const goBack = () => {
    if (origin) router.push(origin.href);
    else router.back();
  };

  return (
    <div className="fixed top-[38px] right-0 z-[999999999] flex w-full items-center justify-end px-[15px] text-white mix-blend-difference">
      <button
        type="button"
        onClick={goBack}
        className="group relative text-sm font-semibold tracking-wide uppercase"
      >
        {origin ? (
          <span className="ease-custom-less absolute top-1/2 right-full translate-x-2 -translate-y-1/2 pr-4 text-sm font-normal tracking-normal whitespace-nowrap normal-case opacity-0 transition-all duration-700 group-hover:translate-x-0 group-hover:opacity-100">
            {origin.label}
          </span>
        ) : null}
        <span className="ease-custom-less inline-block transition-transform duration-700 group-hover:translate-x-[0.35em]">
          (
        </span>
        <span className="px-[0.35em]">{label}</span>
        <span className="ease-custom-less inline-block transition-transform duration-700 group-hover:-translate-x-[0.35em]">
          )
        </span>
      </button>
    </div>
  );
}
