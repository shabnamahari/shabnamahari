"use client";

import { useId, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { revealClass, revealStep, revealTotalMs, type Phase } from "@/lib/reveal";
import { PANEL_BASE, RADIUS, TYPE, WIDTH } from "@/lib/panel";
import GoogleMark from "@/components/GoogleMark";

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

/*
 * The corner, the measure, the glass and the type are in `lib/panel.ts` now.
 *
 * They were written here, and the notes explaining each of them are kept below
 * where they were. What moved them is the account page: it wants this same
 * panel, and three files each holding their own copy of one number is how the
 * three stop being one panel. Only what is peculiar to sign-up is still here.
 */

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

/** The rule under a field, and the button under the three of them. Sign-up's
    own — nothing else on the site takes a typed answer. */
const FIELD =
  "border-b border-[var(--auth-field)] text-[var(--auth-type)] focus:border-[var(--auth-field-lit)]";
const BUTTON =
  "text-[var(--auth-type)] border-[var(--auth-field-lit)] hover:border-[var(--auth-type)]";

/**
 * The two rows with no panel of their own.
 *
 * White under `mix-blend-difference`, everywhere, at every width — which also
 * settles Shabnam's first question. "or" was black on /auth and green on the
 * home page because each ground had its colour written out by hand; blended, it
 * is derived instead. It comes out dark on the cream page and light on the
 * black, and the two pages stop disagreeing about it.
 *
 * On a phone the home page's stack rises off the black onto photographs, where
 * a difference blend has its worst case, so below `md` the terms line takes the
 * panels' own fill. The fork does not: Shabnam asked for a line rather than a
 * box, and its rule carries a fixed mid tone that needs no help.
 */
const BARE = "text-white mix-blend-difference";
const BARE_TERMS =
  "text-white bg-[var(--auth-fill)] backdrop-blur-[5px] rounded-[14px] py-2 " +
  "md:bg-transparent md:py-0 md:backdrop-blur-none md:mix-blend-difference";

/** One row of the form: its label, and the field it names. */
function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  disabled = false,
  inputMode,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  disabled?: boolean;
  inputMode?: "text" | "email" | "numeric";
  maxLength?: number;
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
      <label htmlFor={id} className={`${TYPE} w-[7.5rem] shrink-0 text-[0.875rem]`}>
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        disabled={disabled}
        className={`${FIELD} pointer-events-auto min-w-0 flex-1 bg-transparent pb-1 text-[0.875rem] outline-none transition-colors disabled:opacity-50`}
      />
    </div>
  );
}

/** The four things in the stack, which the stagger needs to count. */
const PANELS = 4;

/**
 * What has been typed, and how far through the round trip we are.
 *
 * Held out here as a value rather than as four `useState` calls inside the
 * panels, because it has to be able to outlive them: closing the stack unmounts
 * `AuthPanels`, and with the state inside, a code already sitting in somebody's
 * inbox became unusable — the address was forgotten, `sent` went back to false,
 * and reopening offered to send a second one against a three-per-quarter-hour
 * ceiling. The bar keeps this and hands it down; `/auth`, which never closes,
 * keeps its own.
 */
export type SignUpForm = {
  name: string;
  email: string;
  code: string;
  /**
   * Whether a code has been asked for, which is the only thing that makes this
   * form two steps rather than one. Its own flag rather than inferred from the
   * code field being non-empty, because someone who types there before asking
   * for anything would otherwise appear to be halfway through a round trip that
   * never started.
   */
  sent: boolean;
  note: string | null;
};

const EMPTY_FORM: SignUpForm = {
  name: "",
  email: "",
  code: "",
  sent: false,
  note: null,
};

/**
 * What the Google round trip left in the URL on its way back, if anything.
 *
 * `?auth=` was being set by the callback on every failure and read by nothing,
 * so a Google sign-in that did not work put people back on the home page with
 * no explanation at all — the worst kind of failure, the silent one.
 *
 * `useSyncExternalStore` rather than an effect: the value cannot change while
 * the page is open, the server has no URL to read, and this is the one hook
 * that can say so without a second render or a hydration mismatch.
 */
const NOTICES: Record<string, string> = {
  failed: "That did not work. Try again, or use your email instead.",
  unverified:
    "Google has not confirmed that address. Use your email instead.",
  mismatch:
    "That address is already in use by a different Google account. Use your email instead.",
};

function useGoogleNotice(): string | null {
  const reason = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("auth"),
    () => null,
  );
  // "cancelled" is not a failure: they pressed cancel and are back where they
  // started, which needs no announcement.
  return reason ? (NOTICES[reason] ?? null) : null;
}

/**
 * The green this stack used to be, for as long as it takes to choose.
 * ---------------------------------------------------------------------------
 * TEMPORARY, and it comes out with the decision. `/?panel=green` puts the old
 * `--color-confirm` fill back on the home page's sign-up stack so Shabnam can
 * see it against the red on the page it actually lives on — the same way
 * `?panel=` served the account page's four candidates, and `?bg=dark` served
 * /auth's ground before that.
 *
 * The stack alone, not the site: /auth she has already approved in red.
 *
 * `useSyncExternalStore` rather than an effect, like the notice below it: the
 * value cannot change while the page is open, the server has no URL to read,
 * and this is the one hook that can say so without a second render or a
 * hydration mismatch.
 */
const TRIAL_GREEN = "rgb(63 107 84 / 0.85)";

function useTrialFill(): CSSProperties | undefined {
  const trial = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("panel"),
    () => null,
  );
  return trial === "green"
    ? ({ "--auth-fill": TRIAL_GREEN } as CSSProperties)
    : undefined;
}

/**
 * The stack itself: the form, the fork, Google, and the terms.
 *
 * Split out from the bar below because it is wanted in two places — under the
 * home page's closing line, where a bar opens it, and on `/auth`, where it is
 * the whole point of the page and stands open with no bar at all. One copy, so
 * the two can never drift into two forms.
 */
export function AuthPanels({
  phase = null,
  form: outerForm,
  onForm: outerOnForm,
}: {
  /** `null` on /auth: nothing was pressed there, so there is nothing to play. */
  phase?: Phase | null;
  /** Supplied by the bar, which has to keep it across a close. */
  form?: SignUpForm;
  onForm?: (next: SignUpForm) => void;
}) {
  const step = (index: number): CSSProperties =>
    phase ? revealStep(index, PANELS, "up", phase) : {};
  const anim = phase ? revealClass("up", phase) : "";

  // Own state only when nobody upstream is holding it — /auth stands open and
  // has nothing to survive.
  const [innerForm, setInnerForm] = useState<SignUpForm>(EMPTY_FORM);
  const form = outerForm ?? innerForm;
  const setForm = outerOnForm ?? setInnerForm;
  const patch = (next: Partial<SignUpForm>) => setForm({ ...form, ...next });

  const { name, email, code, sent } = form;
  // Transient, and deliberately not kept: a request cannot still be in flight
  // after the panel has been closed and reopened.
  const [busy, setBusy] = useState(false);

  const googleNotice = useGoogleNotice();
  const note = form.note ?? googleNotice;

  /*
   * The form does both, which was Shabnam's call: an address that has an account
   * is signed into it and one that does not gets an account made. Nobody has to
   * say in advance which they are doing, so nothing here asks.
   */
  async function requestCode() {
    setBusy(true);
    patch({ note: null });
    try {
      const res = await fetch("/api/auth/code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        patch({ note: data.error ?? "Something went wrong. Try again." });
        return;
      }
      // Neutral on purpose, and it matches what the endpoint will and will not
      // confirm: whether this address has an account here is not something a
      // stranger gets to find out by typing it in.
      patch({ sent: true, note: "If that is a real mailbox, a code is on its way." });
    } catch {
      patch({ note: "Something went wrong. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function submitCode() {
    setBusy(true);
    patch({ note: null });
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        patch({ note: data.error ?? "That code is not right." });
        return;
      }
      // A full navigation rather than a client one: the session arrived as a
      // Set-Cookie on that response, and every server component that has
      // already rendered on this page believes nobody is signed in.
      window.location.assign("/myaccount");
    } catch {
      patch({ note: "Something went wrong. Try again." });
    } finally {
      setBusy(false);
    }
  }

  const ready = sent ? /^\d{6}$/.test(code) : email.trim() !== "";

  return (
    <div className="flex flex-col gap-3">
      {/*
        1 — the one-press way in, and now the top of the stack.

        Above the form on Shabnam's instruction, and it earns the position: it
        is the shorter path, so the longer one should not be the first thing
        read. Neither panel changed size, so the form below it is the tall one
        and now straddles the footer's edge — half on the black, half over the
        page above. That is what the glass was made dark enough for.
      */}
      <a
        href="/api/auth/google/start"
        aria-label="Continue with Google"
        /* A link, not a button with a handler: this leaves the site. Google's
           own screen is the next page, so it should behave like any other
           navigation — openable in a new tab, and one entry in the history.

           The edge brightens on hover rather than the fill. Lightening the fill
           undoes the very thing the alpha was set for: over the cream page a
           lighter panel takes the type back under contrast. */
        className={`${WIDTH} ${PANEL_BASE} ${anim} ${TYPE} pointer-events-auto flex items-center justify-center gap-2 text-[0.9375rem] transition-colors hover:border-confirm-lit`}
        style={{ height: GOOGLE_BAR, ...step(0) }}
      >
        {/*
          Against the word, not at the head of the phrase.

          A sign-in button conventionally opens with the mark, and that is where
          it was. Shabnam's note is that it should sit beside "google", which is
          the word it actually names — so it does, with a tighter gap on its
          right than its left so the eye binds the two together rather than
          reading three evenly spaced things.
        */}
        <span>continue with</span>
        {/*
          The mark is the word now — Shabnam took "google" out and left the G to
          say it, which is what the G is for: it is the one part of that button
          nobody has to read.

          A little larger than it was, because it is carrying the sentence
          rather than decorating it. The link's `aria-label` does the saying for
          anyone who cannot see it, since "continue with" on its own is a
          sentence with the object missing.
        */}
        {/*
          On a white disc, which the red made necessary rather than pretty.
          Google's G is four colours and one of them is #EA4335 — on the green
          panel the mark read cleanly, on Signal Red its own red segment
          vanished into the fill and the rest went muddy, which is the one
          thing this mark cannot afford: nobody reads "continue with", they
          recognise the G. Google's brand terms for sign-in buttons ask for the
          full-colour mark on white or their supplied white mark on dark, so
          the disc is also the sanctioned way round it.
        */}
        <span className="grid h-[1.9em] w-[1.9em] shrink-0 place-items-center rounded-full bg-white">
          <GoogleMark className="h-[1.15em] w-[1.15em]" />
        </span>
      </a>

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
      {/*
        The reveal is on each of the three, not on the row.

        It belongs on the row, and could not stay there. `unmask-*` animates
        `clip-path`, and a clip-path other than `none` makes an element a
        stacking context — which seals its children off from the page behind
        them. `mix-blend-difference` on the word then had nothing to blend
        against and rendered as flat light green on cream, unreadable, which is
        exactly the failure the blend is there to prevent.

        On the children themselves, each blends into this row's own backdrop
        while still being clipped. They share one delay, so the three arrive
        together and it looks no different from animating the row.
      */}
      <div className={`${WIDTH} flex items-center gap-3`}>
        <span className={`bg-auth-rule ${anim} h-px flex-1`} style={step(1)} />
        {/* The word blends and the rules do not — see `--color-auth-rule`. */}
        <span
          className={`${TYPE} ${BARE} ${anim} text-[0.875rem] font-bold`}
          style={step(1)}
        >
          or
        </span>
        <span className={`bg-auth-rule ${anim} h-px flex-1`} style={step(1)} />
      </div>

      {/* 3 — name, email, code, and the slower way in. */}
      <form
        className={`${WIDTH} ${PANEL_BASE} ${anim} pointer-events-auto px-6 py-5`}
        style={step(2)}
        onSubmit={(e) => {
          e.preventDefault();
          if (busy || !ready) return;
          void (sent ? submitCode() : requestCode());
        }}
      >
        <div className="flex flex-col gap-4">
          {/* Capitalised on Shabnam's instruction, and consistently with how the
              site already treats Areas, Insights and Programs: these are the
              names of the things asked for, not sentences about them. */}
          <Field
            label="Name:"
           
            value={name}
            onChange={(v) => patch({ name: v })}
            autoComplete="name"
            disabled={busy}
          />
          <Field
            label="Email:"
           
            value={email}
            onChange={(v) => patch({ email: v })}
            type="email"
            inputMode="email"
            autoComplete="email"
            // Locked once a code is out, because it is the address the code was
            // sent to that is being proven. Editing it here would leave the
            // form asking the server to check a number against a mailbox it was
            // never sent to.
            disabled={busy || sent}
          />
          <Field
            label="Enter code :"
           
            value={code}
            onChange={(v) => patch({ code: v.replace(/\D/g, "").slice(0, 6) })}
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            disabled={busy}
          />
        </div>

        {/* Centred under the three rows, not beside the code field: it acts on
            the email above it, and putting it on the row would have made it
            look like it acts on the code. */}
        <div className="mt-5 flex flex-col items-center gap-3">
          <button
            type="submit"
            disabled={busy || !ready}
            className={`${BUTTON} rounded-full border px-5 py-1.5 text-[0.875rem] transition-colors disabled:opacity-40`}
          >
            {busy ? "…" : sent ? "sign in" : "send code"}
          </button>

          {note && (
            <p className={`${TYPE} text-center text-[0.8125rem]`} aria-live="polite">
              {note}
            </p>
          )}

          {sent && !busy && (
            <button
              type="button"
              onClick={() => patch({ sent: false, code: "", note: null })}
              className={`${TYPE} text-[0.75rem] underline underline-offset-4 opacity-70`}
            >
              use a different address
            </button>
          )}
        </div>
      </form>

      {/* 4 — the terms. On the ground itself with no panel around it, because it
          is not a control: it is the sentence the bar below it commits you to,
          and boxing it would have made it look like a fourth thing to press. */}
      <p
        className={`${WIDTH} ${BARE_TERMS} ${anim} pointer-events-auto px-4 text-center text-[0.8125rem] md:px-0`}
        style={step(3)}
      >
        {/*
          Links at last. This sentence has been asking people to agree to two
          documents that did not exist since the form was first built; now it
          points at them. Underlined rather than coloured, because the line has
          to stay readable on the footer's black, over a photograph and over the
          cream, and `currentColor` is the only thing that survives all three.
        */}
        By signing up, you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

export default function AuthSignUp() {
  /*
   * Three states, not two, because closing is now something you watch rather
   * than something that has already happened.
   *
   * `phase` is what the panels are doing; `null` is the closed page with
   * nothing mounted. Going out, the panels stay mounted through their own
   * animation and are dropped when the last of them has finished — which is
   * what `revealTotalMs` knows and this does not.
   */
  const [phase, setPhase] = useState<Phase | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /*
   * Held here rather than in the panels, because the panels are unmounted when
   * the stack closes and this has to survive that. See `SignUpForm`: without it,
   * closing the stack threw away an address that had already been sent a code.
   */
  const [form, setForm] = useState<SignUpForm>(EMPTY_FORM);

  /*
   * Coming back from a Google attempt that did not work opens the stack.
   *
   * The message explaining what happened lives inside the panels, and the
   * panels are not mounted while the bar is shut — so putting it there and
   * stopping was no better than the silence it replaced. Someone returned here
   * by a failure needs the form, not a closed bar, so the notice opens it.
   *
   * Derived rather than pushed into state: `useSyncExternalStore` reports
   * nothing on the server and the real query on the client, which is the one
   * way to differ across hydration without either a mismatch or an effect.
   */
  const notice = useGoogleNotice();
  // Temporary — the green, for comparison. See useTrialFill.
  const trialFill = useTrialFill();
  const shown: Phase | null = phase ?? (notice ? "in" : null);

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
      /* Temporary, and inert without `/?panel=green` — see useTrialFill. */
      style={trialFill}
    >
      <div className="absolute inset-x-0 bottom-[30px] flex flex-col gap-3 px-[15px]">
        {/*
          Growing up over the photographs above is not a defect to be contained.
          The panels are transparent for the same reason the assistant's are:
          you are meant to see the site through them, and the site is what you
          are signing up to.
        */}
        {shown && <AuthPanels phase={shown} form={form} onForm={setForm} />}

        {/* The way in, and when closed the whole of it. */}
        <div
          className={`${WIDTH} ${PANEL_WHITE} pointer-events-auto flex items-center justify-center`}
          style={{ height: BAR }}
        >
          <button
            type="button"
            aria-expanded={shown === "in"}
            onClick={() => {
              /*
               * A press during the fold-away is ignored rather than queued.
               * Reversing mid-animation would need every panel's delay
               * recomputed from wherever it had got to, and the honest version
               * of that is worth more than it buys on a control this size.
               */
              if (phase === "out") return;

              if (shown === null) {
                setPhase("in");
                return;
              }

              // Mounted through the close, then dropped once the last panel has
              // finished folding — the wait is the animation's, not a guess.
              setPhase("out");
              if (timer.current) clearTimeout(timer.current);
              timer.current = setTimeout(() => setPhase(null), revealTotalMs(PANELS));
            }}
            className="block w-full text-center text-[0.9375rem] text-white"
          >
            {/* One form does both now, so the bar cannot go on addressing only
                the half that has never been here. It leads with signing in
                because that is the repeat visit — the one that happens over and
                over — and still names the other in the same breath. */}
            Sign in, or create an account
          </button>
        </div>
      </div>
    </div>
  );
}
