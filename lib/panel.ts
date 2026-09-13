/**
 * The glass panel, as one set of numbers.
 *
 * Sign-up drew it first and the comments explaining each choice are still in
 * `components/AuthSignUp.tsx` where they were written. What has changed is that
 * a third place now wants the same panel — the account page — and a constant
 * copied into a third file is a constant that will be changed in one of them.
 *
 * So the geometry and the colours live here and the components only say what
 * goes inside. The corner and the measure are the assistant's, taken rather
 * than matched by eye; the colours are custom properties in globals.css, so the
 * same classes read as dark green on the footer's black and pale sage on the
 * site's cream without either page choosing a tone.
 */

/** The assistant's corner. */
export const RADIUS = "rounded-[14px]";

/** The assistant's measure — a shade narrower than YOUR in the headline. */
export const WIDTH = "mx-auto w-[clamp(20rem,34vw,40rem)]";

/**
 * The panel itself, and the type standing on it.
 *
 * The ground underneath decides everything else, and there are two of them: the
 * footer's black at the foot of the home page, the site's cream on /auth and on
 * the account page. The green tint is what survives both — `--color-confirm` at
 * a low alpha reads as a tint of whatever is behind it, dark green on black and
 * pale sage on cream.
 *
 * There were once two sets of classes for that, a dark tone and a light one,
 * and they drifted: a rule changed on one was not changed on the other, so two
 * pages meant to be the same form were quietly becoming two forms. The colours
 * are custom properties in globals.css instead, so every page takes these same
 * two constants and the panels are one panel by construction.
 */
export const PANEL_BASE = `${RADIUS} border border-[var(--auth-edge)] bg-[var(--auth-fill)] backdrop-blur-[5px]`;

export const TYPE = "text-[var(--auth-type)]";
