"use client";

import { useId, useRef, useState } from "react";

/**
 * Sign-up, at the foot of the home page.
 *
 * Closed it is one bar — the same bar the assistant opens with, in the same
 * place in the eye's path: a single line you can take or leave. Open, three
 * more things appear *above* it, so the stack reads upward from the thing you
 * pressed rather than dropping over the headline underneath.
 *
 * The geometry is the assistant's and is deliberately not re-chosen here. Same
 * corner, same width, same bar height, same glass. Two panels that do the same
 * job in two places on one page must not be two designs, and the way to
 * guarantee that is to take the numbers rather than to match them by eye —
 * which is what RADIUS, WIDTH and BAR below are for. They are copied with their
 * reasoning intact from `components/chat/Assistant.tsx`; if that file's numbers
 * move, these move with them.
 *
 * Nothing here authenticates anybody yet. Every control is live to the touch
 * and inert underneath, on purpose: this is the shape being agreed before the
 * Supabase session, the Google client and the one-time codes are wired to it.
 */

/** The assistant's corner. */
const RADIUS = "rounded-[14px]";

/** The assistant's measure — a shade narrower than YOUR in the headline. */
const WIDTH = "mx-auto w-[clamp(20rem,34vw,40rem)]";

/** The assistant's bar. The sign-up bar is this exactly, so they rhyme. */
const BAR = 42;

/**
 * The Google bar, a little taller than the sign-up bar.
 *
 * Shabnam's note, and it earns itself: this is the one control here that
 * completes in a single press, so it is allowed to sit slightly heavier than
 * the bar that merely opens a form.
 */
const GOOGLE_BAR = 52;

/** White glass, on the footer's black. */
const PANEL_WHITE = `${RADIUS} border border-white/25 bg-white/[0.08] backdrop-blur-[5px]`;

/**
 * Green glass, same construction.
 *
 * `confirm` is the brand's green and `confirm-lit` is the same hue carried up
 * in lightness for dark grounds — the pair already exists because the assistant
 * needed it. The fill is the dark one so it stays a tint of the black behind
 * it; the type and the edge are the light one so they clear contrast against
 * that tint.
 */
const PANEL_GREEN = `${RADIUS} border border-confirm-lit/35 bg-confirm/25 backdrop-blur-[5px]`;

/** One row of the form: its label, and the field it names. */
function Field({
  label,
  type = "text",
  autoComplete,
}: {
  label: string;
  type?: string;
  autoComplete?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-baseline gap-3">
      {/*
        A fixed column for the label, so the three rules start at one x rather
        than three. Left to shrink-wrap, "name:", "email:" and "enter code :"
        are three different widths and the fields stepped in and out under each
        other — the panel read as three unrelated rows instead of one form.
        Wide enough for the longest of the three, which is the code.
      */}
      <label
        htmlFor={id}
        className="text-confirm-lit w-[7.5rem] shrink-0 text-[0.875rem]"
      >
        {label}
      </label>
      {/*
        No box around the field. The panel is already a box, and a second border
        inside it turned three quiet rows into a form to be filled in at a desk.
        The rule under each field is the whole affordance.
      */}
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        className="min-w-0 flex-1 border-b border-confirm-lit/25 bg-transparent pb-1 text-[0.875rem] text-white outline-none transition-colors focus:border-confirm-lit/70"
      />
    </div>
  );
}

export default function AuthSignUp() {
  const [open, setOpen] = useState(false);
  const stackRef = useRef<HTMLDivElement>(null);

  return (
    <div data-surface="auth" className="col-span-12">
      {/*
        Opening inserts the stack above the bar, which pushes the bar — and the
        headline under it — down the page. That is the correct flow and the
        wrong feeling: the thing you just pressed walks away from the pointer.
        So the newly opened stack is brought into view in the same gesture,
        which turns the shift into the page following you rather than the button
        escaping. `block: "center"` rather than `"start"`, so the footer
        headline stays in frame underneath and the stack keeps its context.
      */}
      <div ref={stackRef}>
        {open && (
          <div className="flex flex-col gap-3 pb-3">
            {/* 1 — name, email, code, and the one control that is meant to be
                pressed first. */}
            <div className={`${WIDTH} ${PANEL_GREEN} px-6 py-5`}>
              <div className="flex flex-col gap-4">
                <Field label="name:" autoComplete="name" />
                <Field label="email:" type="email" autoComplete="email" />
                <Field label="enter code :" autoComplete="one-time-code" />
              </div>

              {/* Centred under the three rows, not beside the code field: it
                  acts on the email above it, and putting it on the row would
                  have made it look like it acts on the code. */}
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  className="text-confirm-lit rounded-full border border-confirm-lit/45 px-5 py-1.5 text-[0.875rem] transition-colors hover:border-confirm-lit hover:bg-confirm-lit/10"
                >
                  send code
                </button>
              </div>
            </div>

            {/* 2 — the fork between the two ways in. */}
            <p className="text-confirm-lit text-center text-[0.875rem] font-bold">
              or
            </p>

            {/* 3 — the one-press way in. */}
            <button
              type="button"
              className={`${WIDTH} ${PANEL_GREEN} text-confirm-lit flex items-center justify-center text-[0.9375rem] transition-colors hover:bg-confirm/40`}
              style={{ height: GOOGLE_BAR }}
            >
              continue with google
            </button>

            {/* 4 — the terms. On the footer's own black with no panel around
                it, because it is not a control: it is the sentence the bar
                below it commits you to, and boxing it would have made it look
                like a fourth thing to press. */}
            <p className={`${WIDTH} text-center text-[0.8125rem] text-white`}>
              By signing up, you agree to our Terms and Privacy Policy.
            </p>
          </div>
        )}
      </div>

      {/* 5 — the way in, and when closed the whole of it. */}
      <div
        className={`${WIDTH} ${PANEL_WHITE} flex items-center justify-center`}
        style={{ height: BAR }}
      >
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            setOpen((v) => !v);
            if (!open) {
              // After paint, so the stack it is scrolling to exists.
              requestAnimationFrame(() =>
                stackRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                }),
              );
            }
          }}
          className="block w-full text-center text-[0.9375rem] text-white"
        >
          Sign up if you don&rsquo;t have an account
        </button>
      </div>
    </div>
  );
}
