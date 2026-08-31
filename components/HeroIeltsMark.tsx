"use client";

import { useEffect, useRef, useState } from "react";
import RevealLine from "./RevealLine";

/**
 * IELTS / PREPARATION, set beside GOAL at exactly GOAL's cap height.
 *
 * ( WHY IT MEASURES INSTEAD OF CALCULATING )
 *
 * The size has to come from the rendered headline, which is sized by
 * `min()` of three caps that each bind on different windows — see
 * `.hero-stack .text-h1`. Re-deriving that expression here would be a second
 * copy of it, correct until someone edits one of them. So this reads the
 * headline's computed font size and asks the font itself for the rest.
 *
 * Cap height, ascent and descent come from the font via canvas TextMetrics
 * rather than from a table of guessed ratios: `actualBoundingBoxAscent` of a
 * capital is the cap height, and the two `fontBoundingBox` values are the em
 * box. Measured once per resize, at 100px, as ratios.
 *
 * ( HOW THE TWO LINES ARE PINNED )
 *
 * Each line is placed by its own baseline, not by a line-height that happens
 * to look right. Giving a line `line-height: ascent + descent` puts its
 * baseline exactly `ascent` from the top of its box, with no half-leading to
 * account for and no glyph overflowing the reveal mask.
 *
 *   line 1  cap top  ->  GOAL's cap top
 *   line 2  baseline ->  GOAL's baseline
 *
 * The block therefore measures GOAL's cap height by construction, at every
 * window size, without that number appearing anywhere.
 *
 * ( WHY THE TWO LINES ARE NOT THE SAME SIZE )
 *
 * They were, at 0.45 of the headline, and "PREPARATION" ran 151px past the
 * right edge at 1440 and put the whole page into horizontal scroll. It is
 * eleven characters against five: at any size that suits one, the other is
 * wrong. Shrinking both until the long one fits is not a constant either —
 * the size that fits at 1440 still overflows at 1024, because the margin
 * beside GOAL does not scale with the type.
 *
 * So the two lines are set to the same rendered width instead, which is the
 * old editorial answer to a long word under a short one: the block becomes a
 * solid rectangle of type, flush both sides, and the words are sized by how
 * much room each needs rather than by a number picked for both. The pinning
 * is untouched — line one's cap top and line two's baseline still land on
 * GOAL's — so the block still measures GOAL's cap height exactly.
 *
 * The two cap heights are given TIGHT of that height between them and the
 * remainder is the gap, so the leading stays a tenth of the cap height.
 *
 * ( WHERE IT LIVES )
 *
 * Beside the h1, not inside it. The goal row is inside the heading, and
 * putting these words there would splice "IELTS PREPARATION" back into the
 * heading's accessible name, which the previous commit had just cleared out.
 * It is positioned from GOAL's measured rect instead, so it sits where it
 * would have sat and the heading still announces the tagline alone.
 *
 * Hidden below md: at 390px GOAL leaves about 90px to its right and
 * "PREPARATION" at the cap-height rule needs roughly twice that. The rule is
 * the idea, so the breakpoint gives way rather than the rule. The corner
 * kicker carries mobile.
 */

/** Share of GOAL's cap height the two lines' own caps take. The rest is leading. */
const TIGHT = 0.9;

/*
 * Breathing room either side of "with", as a fraction of GOAL's cap height —
 * so the gap scales with the headline rather than with a number typed once.
 *
 * The gap itself is this twice over plus the width of "with", rather than a
 * ratio alone: "with" is set at the note size, which is fixed at 21px and does
 * not scale with the headline, so a pure ratio would crush it on a small window
 * and strand it on a large one. The part that scales is the air around it.
 */
const PAD = 0.22;

/*
 * The block's cap span, as a multiple of GOAL's cap height.
 *
 * Two lines fitted inside GOAL's own cap height. Three cannot and stay legible,
 * so the block grows and is centred on GOAL's cap band instead — what makes it
 * read as belonging to GOAL is a shared middle, not a shared height.
 *
 * 1.2 rather than more because the limit is now horizontal, not vertical.
 * ONLINE is 1.564 times the width of IELTS at one size, so the third line makes
 * the block wider as well as taller, and 1024x768 is where that runs out: the
 * room between GOAL and the window edge does not grow with the type.
 */
const SPAN = 1.2;

/** Kept clear between the block and the window edge. */
const MARGIN = 15;

type Line = { text: string; top: number; fontSize: number; delay: number };

type Metrics = {
  left: number;
  lineHeight: number;
  lines: Line[];
  join: { left: number; top: number; lineHeight: number };
};

export default function HeroIeltsMark() {
  const ref = useRef<HTMLDivElement>(null);
  const [m, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    const el = ref.current;
    const hero = el?.closest<HTMLElement>("[data-hero]");
    const goalRow = hero?.querySelector<HTMLElement>("[data-hero-goal]");
    const goal = goalRow?.querySelector<HTMLElement>(".text-h1");
    if (!el || !hero || !goal) return;

    let live = true;

    const measure = () => {
      if (!live) return;
      const style = getComputedStyle(goal);
      const size = parseFloat(style.fontSize);
      if (!size) return;

      // The font's own proportions, as ratios of the em.
      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx) return;
      ctx.font = `700 100px ${style.fontFamily}`;
      const em = ctx.measureText("H");
      const cap = em.actualBoundingBoxAscent / 100;
      const ascent = em.fontBoundingBoxAscent / 100;
      const descent = em.fontBoundingBoxDescent / 100;
      if (!cap || !ascent) return;

      // GOAL's baseline: its box is one line box tall, and the baseline sits
      // half the leading plus the ascent down from the top of it.
      const box = goal.getBoundingClientRect();
      const heroBox = hero.getBoundingClientRect();
      const lineBox = parseFloat(style.lineHeight) || box.height;
      const baseline =
        box.top - heroBox.top + (lineBox - (ascent + descent) * size) / 2 + ascent * size;
      const capHeight = cap * size;
      const capTop = baseline - capHeight;

      // What each word costs per pixel of type. Canvas can be told about
      // letter spacing but still came out 12.7px adrift of what the browser
      // then drew, which on a block whose whole idea is two flush edges is a
      // visible raggedness. So the widths come from the renderer itself: one
      // hidden span, styled as the real ones, measured at 100px.
      const probe = document.createElement("span");
      probe.style.cssText =
        "position:absolute;visibility:hidden;white-space:nowrap;" +
        "font-weight:700;text-transform:uppercase;letter-spacing:-0.05em;" +
        `font-size:100px;font-family:${style.fontFamily}`;
      hero.appendChild(probe);
      const widthPerPx = (text: string) => {
        probe.textContent = text;
        return probe.getBoundingClientRect().width / 100;
      };
      const wOnline = widthPerPx("Online");
      const wIelts = widthPerPx("IELTS");
      const wPrep = widthPerPx("Preparation");
      probe.remove();
      if (!wOnline || !wIelts || !wPrep) return;

      /*
       * ONLINE and IELTS share a size, so PREPARATION is set to the width of
       * the wider of them, which is ONLINE: at one size it measures 1.564
       * times IELTS, so it is ONLINE that decides how wide the block is.
       *
       * That is also what costs the block its flush right edge — IELTS now
       * ends short of the other two. The alternative is the old rule, all
       * three lines to one width, which keeps the rectangle but makes ONLINE
       * a third smaller than IELTS rather than its equal.
       */
      const span = SPAN * capHeight;
      const display = (TIGHT * span) / (cap * (2 + wOnline / wPrep));
      const base = display * (wOnline / wPrep);
      const lead = ((1 - TIGHT) * span) / 2;

      /*
       * "with" belongs to the note voice — the same face, size and colour as
       * "You will reach your" on the other side of GOAL — so it is measured in
       * that face, not this one.
       *
       * Vertically it is centred on its own ink rather than on its baseline or
       * its em box: the optical middle of a word with ascenders and no
       * descenders is not where either of those falls. `actualBoundingBox`
       * gives the ink, and its midpoint goes on the midline of the cap band
       * that GOAL and the block share.
       */
      const note = document.createElement("span");
      note.className = "text-note";
      note.style.cssText =
        "position:absolute;visibility:hidden;white-space:nowrap";
      note.textContent = "with";
      hero.appendChild(note);
      const noteStyle = getComputedStyle(note);
      const noteSize = parseFloat(noteStyle.fontSize);
      const joinWidth = note.getBoundingClientRect().width;
      ctx.letterSpacing = "normal";
      ctx.font = `${noteStyle.fontWeight} ${noteSize}px ${noteStyle.fontFamily}`;
      const ink = ctx.measureText("with");
      note.remove();

      const joinBaseline =
        capTop +
        capHeight / 2 +
        (ink.actualBoundingBoxAscent - ink.actualBoundingBoxDescent) / 2;

      // Air, then the word, then the same air again.
      const pad = PAD * capHeight;
      const left = box.right - heroBox.left + joinWidth + 2 * pad;
      const width = display * wOnline;

      // Cap top of the first line, cap top of the next, and so on down: the
      // block is centred on GOAL's cap band rather than filling it.
      const topOfBlock = capTop + capHeight / 2 - span / 2;
      const baselineOne = topOfBlock + cap * display;
      const baselineTwo = baselineOne + lead + cap * display;
      const baselineThree = baselineTwo + lead + cap * base;

      // The rule is the idea, so if the block cannot have its full height in
      // the room available it does not appear at all rather than shrink out of
      // agreement with GOAL. It does not fire at any window tested; it is here
      // so that the day it would, the page does not scroll sideways instead.
      if (left + width > heroBox.width - MARGIN) return setMetrics(null);

      setMetrics({
        left,
        lineHeight: ascent + descent,
        join: {
          left: box.right - heroBox.left + pad,
          top: joinBaseline - (ink.fontBoundingBoxAscent || noteSize),
          lineHeight:
            ((ink.fontBoundingBoxAscent || noteSize) +
              (ink.fontBoundingBoxDescent || 0)) /
            noteSize,
        },
        lines: [
          {
            text: "Online",
            fontSize: display,
            top: baselineOne - ascent * display,
            delay: 0.1667,
          },
          {
            text: "IELTS",
            fontSize: display,
            top: baselineTwo - ascent * display,
            delay: 0.2,
          },
          {
            text: "Preparation",
            fontSize: base,
            top: baselineThree - ascent * base,
            delay: 0.2333,
          },
        ],
      });
    };

    // The metrics are the font's, so they are wrong until the font is the one
    // that will actually be drawn.
    document.fonts.ready.then(measure);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(hero);
    return () => {
      live = false;
      observer.disconnect();
    };
  }, []);



  return (
    /*
     * Signal Red, and the same token the cursor uses rather than a second red
     * mixed for the occasion — the guide's point about the accent is that
     * there is one of it. p.9 permits it for very large display type and bans
     * it at body size, which is exactly this and exactly not the kicker.
     */
    /*
     * No aria-label on this box. It carries no role, and a name on a generic
     * container is ignored, so it bought nothing. Checked in Chrome's
     * accessibility tree rather than assumed: both words are exposed as
     * StaticText and neither is marked ignored, so they announce themselves.
     */
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0 max-md:hidden"
    >
      {m?.lines.map((l) => (
        <span
          key={l.text}
          className="font-kumbh absolute font-bold whitespace-nowrap uppercase"
          style={{
            left: `${m.left}px`,
            top: `${l.top}px`,
            fontSize: `${l.fontSize}px`,
            lineHeight: m.lineHeight,
            /*
             * The colour is set here, from the variable, rather than by a
             * `text-cursor` utility on the wrapper. A generated class that is
             * missing from a stale stylesheet leaves this text inheriting
             * --foreground and renders the one coloured thing on the page in
             * near-black; an inline declaration cannot go missing. Same single
             * declaration the cursor's own dot resolves to.
             */
            color: "var(--signal-red)",
            // On each line, not on the wrapper. An em letter-spacing resolves
            // against the font size of the element that declares it and then
            // inherits as an absolute length — set above, both lines got the
            // wrapper's 16px worth, -0.8px, where the headline they are meant
            // to match has -0.05em of a far larger em.
            letterSpacing: "-0.05em",
          }}
        >
          <RevealLine as="span" delay={l.delay} className="inline-block">
            {l.text}
          </RevealLine>
        </span>
      ))}

      {/* The note voice, not the headline's and not the block's: this is the
          same face, size and colour as "You will reach your" on GOAL's other
          side, and it is the word that makes the two halves one sentence. */}
      {m ? (
        <span
          className="text-note text-ink absolute whitespace-nowrap"
          style={{
            left: `${m.join.left}px`,
            top: `${m.join.top}px`,
            lineHeight: m.join.lineHeight,
          }}
        >
          <RevealLine as="span" delay={0.2333} className="inline-block">
            with
          </RevealLine>
        </span>
      ) : null}
    </div>
  );
}
