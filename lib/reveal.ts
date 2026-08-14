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

/** One panel's own animation, in ms. Must match the duration in globals.css. */
const DURATION_MS = 600;

/** Between one panel starting and the next. */
const STAGGER_MS = 90;

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
export function revealTotalMs(count: number): number {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return 0;
  return DURATION_MS + Math.max(0, count - 1) * STAGGER_MS;
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
): CSSProperties {
  const fromEnd = (grow === "up") === (phase === "in");
  const order = fromEnd ? count - 1 - index : index;
  return { "--stagger": `${order * STAGGER_MS}ms` } as CSSProperties;
}
