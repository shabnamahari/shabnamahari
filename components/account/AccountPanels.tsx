"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { PANEL_BASE, TYPE, WIDTH } from "@/lib/panel";
import { revealClass, revealStep } from "@/lib/reveal";
import { LEARN } from "@/lib/routes";
import type { Enrolment } from "@/lib/account/enrolments";

/**
 * The three panels on the account page.
 *
 * Sign-up's panels exactly — same corner, same measure, same green glass, taken
 * from `lib/panel.ts` rather than matched by eye, because Shabnam asked for
 * these to be that panel rather than a panel like it.
 *
 * Two things differ, and both are hers. They unroll downward, top panel first,
 * so the stack reads the way the page does rather than climbing off a bar there
 * is no bar here to climb off. And they take it slower: sign-up's panels are
 * answering a press and should not dawdle, while these are answering a scroll.
 * The pace is named `slow` in `lib/reveal.ts` so "slower" is one speed rather
 * than a number written here.
 */

/** Three, and the stagger has to count them. */
const PANELS = 3;

/**
 * Panel three is taller than the other two, on Shabnam's instruction: it holds
 * a list that grows and the two above it hold a line each. Stated as a floor
 * rather than a height, so a long list pushes it further and a short one still
 * leaves the panel looking like the place a list goes.
 */
const SHORT = 132;
const TALL = 260;

function Panel({
  title,
  index,
  active,
  minHeight,
  children,
}: {
  title: string;
  index: number;
  /** Whether the stack has been scrolled to yet. Before that, nothing shows. */
  active: boolean;
  minHeight: number;
  children: ReactNode;
}) {
  const step: CSSProperties = active
    ? revealStep(index, PANELS, "down", "in", "slow")
    : {};

  return (
    <section
      className={`${WIDTH} ${PANEL_BASE} ${TYPE} px-6 py-5 ${
        active ? revealClass("down", "in") : "opacity-0"
      }`}
      style={{ minHeight, ...step }}
    >
      {/*
        Serif, like the line at the top of the page. These are headings — the
        names of three things — not the small sans labels sign-up puts on the
        controls inside its panel.
      */}
      <h2 className="text-h3">{title}</h2>
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
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  /*
   * Armed by the scroll, like every other entrance on this site.
   *
   * The panels are below the fold — the page opens with a full screen of type
   * above them — so playing on mount would spend the whole animation off
   * screen and leave three panels that appear to have always been there. Once,
   * and then the observer is dropped: a stack that re-unrolled every time it
   * passed the fold would read as a fault.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    /*
     * `data-surface` for the cursor, not for the colours: the site hides the
     * system pointer and draws its own, and anything with links inside it has
     * to say so or the reader cannot see what they are about to press. The
     * panels' own colours come from the same custom properties everywhere.
     */
    <div
      ref={ref}
      data-surface="auth"
      className="flex flex-col gap-3"
    >
      <Panel
        title={name ? `${name}'s account` : "Your account"}
        index={0}
        active={active}
        minHeight={SHORT}
      >
        {/* The one thing this page has always known for certain. */}
        <p>Signed in as {email}.</p>
      </Panel>

      <Panel
        title="Messages from instructor"
        index={1}
        active={active}
        minHeight={SHORT}
      >
        {/*
          Said plainly. There is no messaging yet, and an empty panel that
          implies a message might arrive tomorrow would be a promise made by a
          page rather than by Shabnam.
        */}
        <p className="opacity-70">Nothing here yet.</p>
      </Panel>

      <Panel title="My courses" index={2} active={active} minHeight={TALL}>
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
                {/* The Program a single entry sits inside, so two entries with
                    similar names are not two lines that look alike. */}
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
    </div>
  );
}
