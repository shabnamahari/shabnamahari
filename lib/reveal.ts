import type { CSSProperties } from "react";

/**
 * The unmask, shared by sign-up and the assistant.
 *
 * Shabnam chose it over a slide and then asked for it in two more places: on
 * the way out as well as in, and on the assistant exactly as on sign-up. Two
 * components running the same effect from two sets of numbers is how they stop
 * being the same effect, so the numbers and the arithmetic live here and the
 * components only say which way they grow.
 *
 * The CSS is in globals.css under "panels opening and closing".
 */

/**
 * How fast, which is now two answers rather than one.
 *
 * Sign-up and the assistant open at `normal`: they are answering a press, and a
 * panel that dawdles after a press reads as a page that is thinking. The
 * account page's panels are not answering anything — nobody pressed them, they
 * arrive as you scroll to them — and Shabnam asked for them slower. So the pace
 * is named here rather than each caller writing its own milliseconds, which is
 * how "slower" would otherwise become three different speeds.
 *
 * The duration is handed to the CSS as `--unmask-duration`; only the fallback
 * in globals.css states 0.6s, and it is `normal` written twice on purpose — one
 * of the two is what runs when no pace is given at all.
 */
export type Pace = "normal" | "slow";

const PACES: Record<Pace, { duration: number; stagger: number }> = {
  normal: { duration: 600, stagger: 90 },
  /*
   * Two and a half times the press, and a beat between panels long enough that
   * each is most of the way open before the next starts.
   *
   * It was 900/220 and Shabnam asked for slower again — she wants to watch it,
   * which is a different thing from wanting it acknowledged. Four panels at
   * these numbers take 2.85 seconds end to end. That is a long time for an
   * interface and the right time for this one: nobody is waiting on it, since
   * the page behind is already legible and the panels are the last thing to
   * arrive rather than the thing being asked for.
   */
  slow: { duration: 1500, stagger: 450 },
};

/**
 * Which way the stack grows away from its bar.
 *
 * Sign-up's panels stand above their bar, so they grow up; the assistant's hang
 * below theirs, so they grow down. Both are uncovered from the edge nearest the
 * bar, which is what makes this one effect in two places rather than one of
 * them playing backwards.
 */
export type Grow = "up" | "down";

export type Phase = "in" | "out";

export function revealClass(grow: Grow, phase: Phase): string {
  return `unmask-${grow}-${phase}`;
}

/**
 * How long until the last panel has finished, so a caller knows when it may
 * unmount them. Honours the reader's motion preference: with animations off
 * there is nothing to wait for, and waiting anyway would leave the panels sat
 * on screen for the length of an animation that never ran.
 */
export function revealTotalMs(count: number, pace: Pace = "normal"): number {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return 0;
  const { duration, stagger } = PACES[pace];
  return duration + Math.max(0, count - 1) * stagger;
}

/**
 * The delay for one panel, as the custom property the CSS reads.
 *
 * Opening, the panel nearest the bar moves first, so the stack unrolls away
 * from the hand that pressed it. Closing runs the same order backwards — the
 * far end folds away first and the stack rolls back into the bar.
 *
 * Which index is "nearest the bar" depends on the direction: a stack that grows
 * up is written top-down and so its last child is the one against the bar,
 * while a stack that grows down has its first child there. That is the whole
 * reason both arguments are needed, and it is why this is arithmetic in one
 * place rather than a `map` with a comment in each component.
 */
export function revealStep(
  index: number,
  count: number,
  grow: Grow,
  phase: Phase,
  pace: Pace = "normal",
): CSSProperties {
  const { duration, stagger } = PACES[pace];
  const fromEnd = (grow === "up") === (phase === "in");
  const order = fromEnd ? count - 1 - index : index;
  return {
    "--stagger": `${order * stagger}ms`,
    "--unmask-duration": `${duration}ms`,
  } as CSSProperties;
}
