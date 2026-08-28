"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { PANEL_BASE, TYPE, WIDTH } from "@/lib/panel";
import { revealClass, revealStep, revealTotalMs, type Phase } from "@/lib/reveal";
import { LEARN } from "@/lib/routes";
import type { Enrolment } from "@/lib/account/enrolments";
import SignOut from "@/components/account/SignOut";

/**
 * The account page's panels: a bar you press, and three that unroll under it.
 *
 * This is the assistant's shape, which is what Shabnam asked for — one bar at
 * the top of the page and the rest of the stack hanging off it, growing down
 * and away from the thing that was pressed. The panels themselves are sign-up's
 * exactly, from `lib/panel.ts` rather than a third copy of the same numbers.
 *
 * They came in a column with no bar at all and revealed themselves on scroll.
 * That was fine while the top panel held only a name; once the page lost its
 * welcome line, the name became the only thing identifying whose page this is,
 * and a name is the natural label for the control that opens the rest.
 *
 * The pace is `slow` in `lib/reveal.ts` — 1.5s a panel, 450ms apart, near three
 * seconds for the three. Deliberate: nothing is waiting on it, and Shabnam
 * asked twice for slower so it can be watched.
 */

/** The three that unroll. The bar is not one of them — it never moves. */
const PANELS = 3;

/**
 * The heights, and which of them Shabnam has fixed.
 *
 * `MESSAGES` she asked not to touch. `COURSES` grew when the first panel left
 * the column: that room went somewhere, and the panel holding a list that grows
 * is where it should go. Floors rather than heights, so a long list pushes
 * further and a short one still looks like the place a list goes.
 */
const MESSAGES = 132;
const COURSES = 340;

/** The way out, at sign-up's own bar height plus the line above it. */
const SIGN_OUT = 92;

/** The mark under the bar's label: press me, and this opens downward. */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 8"
      aria-hidden="true"
      className={`h-2 w-4 transition-transform duration-500 ease-[cubic-bezier(0.82,0,0.18,1)] ${
        open ? "rotate-180" : ""
      }`}
    >
      {/* Two strokes rather than a glyph: the site sets its own marks — the
          asterisk, the G — and a text arrow would arrive in whatever the
          system happened to have. `currentColor`, so it takes the panel's
          type colour wherever the panel ends up. */}
      <path
        d="M1 1L8 7L15 1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Panel({
  title,
  index,
  phase,
  minHeight,
  children,
}: {
  title: string;
  index: number;
  phase: Phase;
  minHeight: number;
  children: ReactNode;
}) {
  const step: CSSProperties = revealStep(index, PANELS, "down", phase, "slow");

  return (
    <section
      className={`${WIDTH} ${PANEL_BASE} ${TYPE} ${revealClass("down", phase)} pointer-events-auto px-6 py-5`}
      style={{ minHeight, ...step }}
    >
      {/*
        Kumbh at label size, on Shabnam's instruction — the serif that was here
        is gone. Small on purpose: a panel holding one line of text does not
        need a heading that outweighs it.
      */}
      <h2 className="font-kumbh text-[0.9375rem] font-bold tracking-[-0.02em] uppercase">
        {title}
      </h2>
      <div className="mt-4 text-[0.875rem]">{children}</div>
    </section>
  );
}

export default function AccountPanels({
  name,
  email,
  courses,
}: {
  /** What to call them. Null when nobody ever said — Google may decline to. */
  name: string | null;
  email: string;
  courses: Enrolment[];
}) {
  /*
   * Three states, not two, because closing is watched rather than instant —
   * sign-up's own arrangement and for the same reason. `null` is the shut page
   * with nothing mounted; going out, the panels stay mounted through their own
   * animation and are dropped when the last has finished, which is what
   * `revealTotalMs` knows and this does not.
   */
  const [phase, setPhase] = useState<Phase | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const open = phase === "in";

  return (
    /*
     * Out of the flow, over the type. The sentence behind is centred in the
     * window as though nothing else were there, and the stack hangs from the
     * top of the page rather than taking a row in it — so opening the panels
     * cannot move a single line of it.
     *
     * 24px above md and 76 below, which is not an inconsistency but the two
     * different answers to the same question. The header's Menu, with Back
     * under it, comes down to about 65 in the top right corner. On a wide
     * window the bar is 40rem in the middle and nowhere near it, so it goes as
     * high as it can; on a phone it is 20rem of a 390px screen and passes
     * directly under that corner, so it starts below it instead.
     *
     * Pinned with `top-0` and pushed down by padding, rather than carried on
     * `top` itself. The difference only shows when something goes wrong, and it
     * showed: a stale dev stylesheet had the markup's new class names and not
     * their rules, so `top` fell back to `auto` — and an absolutely positioned
     * child of a centred flex container with no `top` is centred, which put the
     * whole stack in the middle of the page and moved it every time it grew.
     * `top-0` is old enough to be in any stylesheet this page has ever had, so
     * the same failure now costs 76px of position instead of the layout.
     *
     * `data-surface` does two jobs here. The cursor is the first — the site
     * hides the system pointer and draws its own, and anything with controls
     * inside it has to say so or the reader cannot see what they are pressing;
     * the rule tests for the attribute, not for a particular value. The second
     * is the colour: `account` is where these panels stop being sign-up's green
     * and become the site's red, in globals.css, for this page alone.
     */
    <div
      data-surface="account"
      className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-3 px-gutter pt-[76px] md:pt-[24px]"
    >
      {/*
        The bar, and when shut the whole of it.

        It carries the reader's name because the welcome line above it is gone
        on Shabnam's instruction — so this is now the one thing on the page that
        says whose page it is.
      */}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          /*
           * A press during the fold-away is ignored rather than queued.
           * Reversing mid-animation would need every panel's delay recomputed
           * from wherever it had got to, and at this pace that is nearly three
           * seconds of arithmetic to get right for a control this size.
           */
          if (phase === "out") return;

          if (phase === null) {
            setPhase("in");
            return;
          }

          setPhase("out");
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(
            () => setPhase(null),
            revealTotalMs(PANELS, "slow"),
          );
        }}
        className={`${WIDTH} ${PANEL_BASE} ${TYPE} pointer-events-auto flex flex-col items-center gap-2 px-6 py-4`}
      >
        <span className="font-kumbh text-[0.9375rem] font-bold tracking-[-0.02em] uppercase">
          {name ? `${name}'s account` : "Your account"}
        </span>
        <Chevron open={open} />
      </button>

      {phase && (
        <>
          <Panel
            title="Messages from instructor"
            index={0}
            phase={phase}
            minHeight={MESSAGES}
          >
            {/*
              Said plainly. There is no messaging yet, and an empty panel that
              implies a message might arrive tomorrow would be a promise made
              by a page rather than by Shabnam.
            */}
            <p className="opacity-70">Nothing here yet.</p>
          </Panel>

          <Panel title="My courses" index={1} phase={phase} minHeight={COURSES}>
            {courses.length ? (
              <ul className="flex flex-col gap-3">
                {courses.map((course) => (
                  <li key={course.href}>
                    <Link
                      href={course.href}
                      className="underline underline-offset-4 opacity-90 transition-opacity hover:opacity-100"
                    >
                      {course.title}
                    </Link>
                    {/* The Program a single entry sits inside, so two entries
                        with similar names are not two lines that look alike. */}
                    {course.program ? (
                      <span className="opacity-60"> — {course.program}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="opacity-70">
                No courses on your account yet.{" "}
                <Link href={LEARN} className="underline underline-offset-4">
                  See what there is
                </Link>
                .
              </p>
            )}
          </Panel>

          {/*
            The address that proves who this is, and the way out, in the last
            panel rather than the first.

            The email was in the top panel while that panel was a panel. It is a
            bar now and holds a name and a chevron, so the address moved to the
            one place it still belongs: beside the control that ends the session
            it identifies.
          */}
          <div
            className={`${WIDTH} ${PANEL_BASE} ${TYPE} ${revealClass("down", phase)} pointer-events-auto flex flex-col items-center justify-center gap-2`}
            style={{
              height: SIGN_OUT,
              ...revealStep(2, PANELS, "down", phase, "slow"),
            }}
          >
            <p className="text-[0.8125rem] opacity-70">Signed in as {email}.</p>
            <SignOut />
          </div>
        </>
      )}
    </div>
  );
}
