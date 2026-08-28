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

/** The sweep of the arrow's panel across the button, and the word's fade. */
const SWEEP_MS = 500;

/** The arrow panel's own tone, a third of the way from the pill to the ink. */
const TINT = "rgb(25 25 25 / 0.35)";

/**
 * The arrow's panel at rest, and where the word starts because of it.
 *
 * 32px on Shabnam's instruction, down from 40. The word's own inset comes off
 * the same number so the eight pixels between the two are the eight pixels
 * they were — moving one without the other leaves the word stranded in the
 * middle of nowhere.
 */
const ARROW_BOX = 32;
const WORD_INSET = ARROW_BOX + 8;

/** Drawn rather than imported.
 *
 * The reference Shabnam sent takes this arrow from `lucide-react`, on top of
 * `@radix-ui/react-slot` and `class-variance-authority` for the shadcn button
 * under it. This project is not a shadcn project — there is no `components/ui`,
 * no `cn`, none of those three packages — and it draws its own marks: the
 * asterisk, Google's G, the account bar's chevron. Three dependencies for four
 * lines of path is not a trade worth making, and the effect is identical.
 */
function ArrowLeft() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="h-4 w-4 opacity-60"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 8H3" />
      <path d="M7 4L3 8l4 4" />
    </svg>
  );
}

/**
 * Sits directly under the header's Menu, and is now a button rather than a word.
 *
 * Shabnam sent a reference for it: a pill with the word in it and the arrow in
 * a tinted panel at its left edge; on hover the panel sweeps the full width and
 * the word fades under it. That is what this is. What it replaces is the site's
 * own gesture — brackets clamping onto the word against Menu's opening around
 * it, and an arrow drawn out to the left by the pointer's distance across the
 * control. Both are gone deliberately, at her instruction and having been shown
 * the reference.
 *
 * Two things are kept because she asked for them by name.
 *
 * **The destination stays.** A control that walks history cannot otherwise say
 * where it lands, and these pages are reachable from several directions. It
 * still slides in from the left on hover, which is the moment it is wanted:
 * the word is fading out under the sweep just as the place it goes arrives.
 *
 * **And on the click the whole thing leaves to the left before the page does.**
 *
 * The colours are the site's, not the reference's. Under the strip's
 * `mix-blend-difference` a white pill renders near-black on the cream page and
 * white over the footer's black — which is the whole reason this corner is
 * blended, and why a solid dark pill copied literally would have vanished the
 * moment anyone scrolled to the bottom of a page.
 */
export default function BackControl({
  label = "Back",
  fallback,
  preferStored = false,
}: {
  label?: string;
  /** Where the page itself says Back leads — see `lib/back.ts`. */
  fallback?: BackOrigin;
  /**
   * Whether to prefer the origin `AuthLink` stashed over `fallback`.
   *
   * Off by default, and that is the point: the key is written on the way to
   * /auth and never cleared, so a page that read it unconditionally would send
   * someone back to an entry they visited ten minutes ago instead of to its
   * own parent.
   */
  preferStored?: boolean;
}) {
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);
  /*
   * Hover held as state rather than left to `group-hover:`, and it is not a
   * preference.
   *
   * Every visible part of this effect used to hang off a Tailwind class name —
   * the panel's width, its tint, the word's fade, the destination's slide. Twice
   * in two days a tweak to one of those changed its class name, Shabnam's tab
   * kept the old stylesheet, and the rule behind the new name was simply not
   * there: the first time the whole stack was centred in the middle of a page,
   * the second time the two halves of this button came out as one. Written as
   * state and inline styles, the effect travels with the markup that describes
   * it and no stylesheet can be missing a piece of it.
   *
   * Focus counts as hover here, which the classes never did. Somebody arriving
   * on this control by keyboard now gets the arrow and the destination too.
   */
  const [isOpen, setIsOpen] = useState(false);

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
    if (!preferStored || !stored) return fallback ?? null;
    try {
      return JSON.parse(stored) as BackOrigin;
    } catch {
      // A malformed store just means no note; the control still works.
      return fallback ?? null;
    }
  }, [stored, fallback, preferStored]);

  // Following the stored href is truer than history: it lands on the entry that
  // sent you here even if you have since navigated within this page. History is
  // the last resort, for anyone who arrived at this URL directly and whose page
  // named no parent either.
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
    // `pointer-events-none` on the bar, `auto` on the button: this is a
    // full-width fixed strip, and without it everything it crosses — the
    // assistant's bar sits at exactly this height — stops taking clicks.
    <div className="pointer-events-none fixed top-[38px] right-0 z-[999999999] flex w-full items-center justify-end px-gutter text-white mix-blend-difference">
      <div
        className="pointer-events-auto relative flex items-center"
        onPointerEnter={() => setIsOpen(true)}
        onPointerLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
      >
        {origin ? (
          <span
            /*
             * Outside the button rather than inside it, which the sweep forced:
             * anything within the pill is under `overflow-hidden` and would be
             * cut off, and anything under the arrow's panel would be covered by
             * it at full width. Here it is beside the control and clear of both.
             */
            className="ease-custom-less pointer-events-none absolute top-1/2 right-full -translate-y-1/2 pr-4 text-sm font-normal whitespace-nowrap transition-all duration-700"
            style={{
              opacity: isOpen ? 1 : 0,
              translate: isOpen ? "0 -50%" : "0.5rem -50%",
            }}
          >
            {origin.label}
          </span>
        ) : null}

        <button
          type="button"
          onClick={goBack}
          style={{
            transform: isLeaving ? `translateX(${SLIDE_DISTANCE})` : undefined,
            opacity: isLeaving ? 0 : undefined,
            paddingLeft: WORD_INSET,
            transition: `transform ${SLIDE_MS}ms ${SLIDE_CURVE}, opacity ${SLIDE_MS}ms ${SLIDE_CURVE}`,
          }}
          className="text-ink relative flex h-9 items-center justify-center overflow-hidden rounded-md bg-white pr-4 text-xs font-semibold tracking-wide uppercase"
        >
          {/* The word, fading as the panel arrives over it. */}
          <span
            className="transition-opacity"
            style={{
              opacity: isOpen ? 0 : 1,
              transitionDuration: `${SWEEP_MS}ms`,
            }}
          >
            {label}
          </span>

          {/*
            The panel, and the arrow riding at its centre.

            A quarter of the button at rest and the whole of it on hover, so the
            arrow travels from the left edge to the middle as the word leaves.
            `bg-current` rather than a colour of its own: this whole strip is
            blended, and a fixed tint would come out as one shade on the cream
            page and another over the footer.

            0.35 rather than the reference's 0.15, and the difference is the
            blend rather than taste. A 15% tint on a white pill composites to
            about #dc; under `mix-blend-difference` over the cream page that
            lands within three values of the pill itself, so the two zones came
            out as one and Shabnam said so — the reference has a plainly greyer
            block, two boxes in one box. 0.35 composites to about #af, which
            separates from the pill by sixty values on the cream and by eighty
            over the footer's black. The same step both ways round.

            Written as a style rather than as `bg-current/35`, which is the
            second half of that story. Changing the tint changed the class name,
            her stylesheet still held the old one, and an element whose only
            background lives in a rule that is not there has no background at
            all — the two zones came out as one again, for a completely
            different reason than the first time. This is the same trap that
            put the account stack in the middle of the page. A literal ink here
            rather than `currentColor`, since the pill sets `text-ink` and
            nothing else ever colours it.
          */}
          <i
            aria-hidden="true"
            className="absolute inset-y-0 left-0 z-10 grid place-items-center transition-all ease-[cubic-bezier(0.82,0,0.18,1)]"
            style={{
              width: isOpen ? "100%" : ARROW_BOX,
              backgroundColor: TINT,
              transitionDuration: `${SWEEP_MS}ms`,
            }}
          >
            <ArrowLeft />
          </i>
        </button>
      </div>
    </div>
  );
}
