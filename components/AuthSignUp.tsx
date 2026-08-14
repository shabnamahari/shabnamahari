"use client";

import { useId, useRef, useState } from "react";
import type { CSSProperties } from "react";

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
 * The ground the panels are standing on, which decides everything else.
 *
 * They began as one set of colours because they began in one place. Then the
 * same form was wanted on `/auth`, and `/auth` is the site's cream — where
 * light type on transparent glass is a white box on a white page. So the panels
 * take the ground as an argument instead of assuming it.
 *
 * The green tint is the one thing that survives both: `--color-confirm` at a
 * low alpha reads as a tint of whatever is behind it, which is a dark green on
 * black and a pale sage on cream. What has to change is the type — light on the
 * dark ground, and the site's own ink on the light one.
 */
type Tone = "dark" | "light";

/** Every colour that differs between the two grounds, in one place. */
const TONES: Record<
  Tone,
  {
    panel: string;
    label: string;
    input: string;
    button: string;
    or: string;
    terms: string;
    /** The two rules that run out from "or" to either edge of the measure. */
    rule: string;
    /** For the two rows with no panel of their own — see where it is used. */
    bare: string;
  }
> = {
  dark: {
    // `auth-panel` rather than a tint of `confirm`, because these panels grow up
    // off the footer and over the cream page behind it — see the token.
    panel: `${RADIUS} border border-confirm-lit/35 bg-auth-panel backdrop-blur-[5px]`,
    label: "text-confirm-lit",
    input:
      "border-b border-confirm-lit/25 text-white focus:border-confirm-lit/70",
    button:
      "text-confirm-lit border-confirm-lit/45 hover:border-confirm-lit hover:bg-confirm-lit/10",
    or: "text-confirm-lit",
    terms: "text-white",
    rule: "bg-confirm-lit/45",
    /*
     * Bare on the black, and on its own glass below it.
     *
     * These two rows have no panel by Shabnam's design — type straight onto the
     * footer. That holds on a wide screen, where the black reaches high enough
     * to be behind them. On a phone it does not: measured at 390px, "or" opens
     * 108px above the footer's edge and the terms line straddles it, so both
     * were sitting on cream and photographs, and both were invisible.
     *
     * `mix-blend-difference` — the site's own answer, and how ( Menu ) and
     * ( Back ) survive either ground — rescues them over flat cream but not over
     * a mid-grey photograph, which is the worst case a difference blend has.
     * So below `md` they take the same glass the panels have, which is dark
     * enough to hold its type over anything the page can put behind it (5:1 on
     * the lightest part of a photograph, 8:1 on a mid-tone). From `md` up the
     * glass goes away and they are bare again, exactly as specified.
     */
    bare:
      "bg-auth-panel backdrop-blur-[5px] rounded-[14px] py-2 " +
      "md:rounded-none md:bg-transparent md:py-0 md:backdrop-blur-none md:mix-blend-difference",
  },
  /*
   * Ink rather than the dark green, on Shabnam's instruction — she wanted to see
   * the form on its own page in black type before any colour is settled there.
   * The green stays in the tint and the edges, so the panels are still the same
   * panels; only the reading matter is the site's ordinary ink.
   */
  light: {
    panel: `${RADIUS} border border-confirm/40 bg-confirm/15 backdrop-blur-[5px]`,
    label: "text-ink",
    input: "border-b border-confirm/40 text-ink focus:border-confirm",
    button: "text-ink border-ink/30 hover:border-ink hover:bg-ink/5",
    or: "text-ink",
    terms: "text-ink",
    rule: "bg-ink/25",
    // /auth is one flat cream page at every width, so nothing has to survive a
    // change of ground: no glass, and no blend to muddy the ink.
    bare: "",
  },
};

/** One row of the form: its label, and the field it names. */
function Field({
  label,
  tone,
  type = "text",
  autoComplete,
}: {
  label: string;
  tone: Tone;
  type?: string;
  autoComplete?: string;
}) {
  const id = useId();
  const t = TONES[tone];
  return (
    <div className="flex items-baseline gap-3">
      {/*
        A fixed column for the label, so the three rules start at one x rather
        than three. Left to shrink-wrap, "name:", "email:" and "enter code :"
        are three different widths and the fields stepped in and out under each
        other — the panel read as three unrelated rows instead of one form.
        Wide enough for the longest of the three, which is the code.
      */}
      <label htmlFor={id} className={`${t.label} w-[7.5rem] shrink-0 text-[0.875rem]`}>
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
        className={`${t.input} pointer-events-auto min-w-0 flex-1 bg-transparent pb-1 text-[0.875rem] outline-none transition-colors`}
      />
    </div>
  );
}

/**
 * How the stack arrives.
 *
 * `?reveal=1` and `?reveal=2` on the home page switch between them so the two
 * can be watched rather than described. Once Shabnam picks one this becomes a
 * constant and the loser's keyframes come out of globals.css.
 */
type Reveal = 1 | 2 | null;

const REVEAL_CLASS: Record<1 | 2, string> = {
  1: "auth-rise",
  2: "auth-unmask",
};

/** Between one panel starting and the next. */
const STAGGER_MS = 90;

/**
 * The stack itself: the form, the fork, Google, and the terms.
 *
 * Split out from the bar below because it is wanted in two places — under the
 * home page's closing line, where a bar opens it, and on `/auth`, where it is
 * the whole point of the page and stands open with no bar at all. One copy, so
 * the two can never drift into two forms.
 */
export function AuthPanels({
  tone = "dark",
  reveal = null,
}: {
  tone?: Tone;
  reveal?: Reveal;
}) {
  const t = TONES[tone];

  /*
   * Bottom-up, so the panel nearest the bar you pressed moves first and the
   * stack unrolls away from your hand. The children are written top-down, so
   * the delay counts backwards: the terms line is last in the list and first to
   * arrive. `null` means no animation at all, which is what /auth passes —
   * nothing was pressed there, so there is nothing to reveal.
   */
  const COUNT = 4;
  const step = (index: number): CSSProperties =>
    reveal ? ({ "--stagger": `${(COUNT - 1 - index) * STAGGER_MS}ms` } as CSSProperties) : {};
  const anim = reveal ? REVEAL_CLASS[reveal] : "";

  return (
    <div className="flex flex-col gap-3">
      {/* 1 — name, email, code, and the one control that is meant to be
          pressed first. */}
      <div className={`${WIDTH} ${t.panel} ${anim} pointer-events-auto px-6 py-5`} style={step(0)}>
        <div className="flex flex-col gap-4">
          {/* Capitalised on Shabnam's instruction, and consistently with how the
              site already treats Areas, Insights and Programs: these are the
              names of the things asked for, not sentences about them. */}
          <Field label="Name:" tone={tone} autoComplete="name" />
          <Field label="Email:" tone={tone} type="email" autoComplete="email" />
          <Field label="Enter code :" tone={tone} autoComplete="one-time-code" />
        </div>

        {/* Centred under the three rows, not beside the code field: it acts on
            the email above it, and putting it on the row would have made it
            look like it acts on the code. */}
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            className={`${t.button} rounded-full border px-5 py-1.5 text-[0.875rem] transition-colors`}
          >
            send code
          </button>
        </div>
      </div>

      {/*
        2 — the fork between the two ways in.

        `BARE` on the dark tone, and this is the one place the stack's freedom to
        climb costs something. The panels carry their own ground so they are
        legible wherever they end up; these two lines have none by Shabnam's
        design — white type straight onto the footer's black — and on a phone the
        stack rises far enough that both land on the cream page instead, where
        white on cream is nothing at all. Measured: on a 390px screen "or" sits
        108px above the footer's edge and the terms line straddles it.

        `mix-blend-difference` is the site's own answer to type that crosses both
        grounds — it is how ( Menu ) and ( Back ) stay readable over cream and
        black alike. On the black they render exactly as specified; over the
        cream they invert and stay readable. The cost is the green: inverted
        against cream it is no longer green, which is Shabnam's to accept or
        refuse.
      */}
      <div className={`${WIDTH} ${t.bare} ${anim} flex items-center gap-3`} style={step(1)}>
        <span className={`${t.rule} h-px flex-1`} />
        <span className={`${t.or} text-[0.875rem] font-bold`}>or</span>
        <span className={`${t.rule} h-px flex-1`} />
      </div>

      {/* 3 — the one-press way in. */}
      <button
        type="button"
        /* The edge brightens on hover rather than the fill. Lightening the fill
           undoes the very thing the alpha was set for: over the cream page a
           lighter panel takes the type back under contrast. */
        className={`${WIDTH} ${t.panel} ${anim} ${t.or} pointer-events-auto flex items-center justify-center text-[0.9375rem] transition-colors hover:border-confirm-lit`}
        style={{ height: GOOGLE_BAR, ...step(2) }}
      >
        continue with google
      </button>

      {/* 4 — the terms. On the ground itself with no panel around it, because it
          is not a control: it is the sentence the bar below it commits you to,
          and boxing it would have made it look like a fourth thing to press. */}
      <p
        className={`${WIDTH} ${t.terms} ${t.bare} ${anim} px-4 text-center text-[0.8125rem] md:px-0`}
        style={step(3)}
      >
        By signing up, you agree to our Terms and Privacy Policy.
      </p>
    </div>
  );
}

export default function AuthSignUp() {
  const [open, setOpen] = useState(false);
  const [reveal, setReveal] = useState<1 | 2>(1);
  const barRef = useRef<HTMLDivElement>(null);

  return (
    /*
     * Out of the flow entirely, and that is the whole point of it.
     *
     * In the grid this sat above the headline as a row, so opening it inserted
     * three hundred pixels of panel and pushed "First attempt or third" — and
     * everything under it — down the page. Shabnam put two screenshots side by
     * side to show how far it moved. Taken out of flow, the headline never
     * learns the stack exists: the bar holds its place above it and the panels
     * grow up over the section behind.
     *
     * `top` is the footer's own top padding, which is where the headline
     * starts, and the stack hangs from the bottom of that line rather than
     * sitting on top of it. So the two numbers cannot disagree.
     */
    <div
      data-surface="auth"
      /*
       * No z-index, deliberately. A positioned element already paints over the
       * static content of the section above, which is all that is wanted here —
       * and any z-index would make this a stacking context, which would seal the
       * two blended lines off from the page they have to blend with.
       */
      className="pointer-events-none absolute inset-x-0 top-[100px] md:top-[200px]"
    >
      <div className="absolute inset-x-0 bottom-[30px] flex flex-col gap-3 px-[15px]">
        {/*
          Growing up over the photographs above is not a defect to be contained.
          The panels are transparent for the same reason the assistant's are:
          you are meant to see the site through them, and the site is what you
          are signing up to.
        */}
        {open && <AuthPanels reveal={reveal} />}

        {/* The way in, and when closed the whole of it. */}
        <div
          ref={barRef}
          className={`${WIDTH} ${PANEL_WHITE} pointer-events-auto flex items-center justify-center`}
          style={{ height: BAR }}
        >
          <button
            type="button"
            aria-expanded={open}
            onClick={() => {
              /*
               * Read on the press rather than in an effect. The variant only
               * matters at the moment the stack is built, and reading it here
               * keeps it out of render — no second pass, no server and client
               * disagreeing about a query string the server never saw.
               */
              if (!open) {
                const v = new URLSearchParams(window.location.search).get("reveal");
                setReveal(v === "2" ? 2 : 1);
              }
              setOpen((prev) => !prev);
            }}
            className="block w-full text-center text-[0.9375rem] text-white"
          >
            Sign up if you don&rsquo;t have an account
          </button>
        </div>
      </div>
    </div>
  );
}
