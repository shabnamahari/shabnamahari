"use client";

import { useEffect, useRef } from "react";
import {
  primeKineticAudio,
  startKineticSound,
  type KineticVoice,
} from "@/lib/kineticAudio";

/**
 * The category tiles' kinetic type, after the motion reference the site owner
 * supplied: several copies of the word stacked exactly on top of each other —
 * so at rest you only see the front one — which then bloom apart together, the
 * ones behind blowing past the frame, before folding back onto the front copy
 * and repeating. The front copy never moves, which is what keeps the word
 * readable at tile size.
 *
 * Runs on hover (with a synthesised swell to match); still on touch is not an
 * option there, so touch devices get the loop without sound.
 * Only <span>s — this renders inside a link that lives in running text.
 */
export default function KineticTypeTile({
  lines,
  size = "24cqmin",
  layers = 3,
  ratio = 2.4,
  duration,
  tone = 174,
  sound = true,
  voice = "bowed",
}: {
  /** The category word, one entry per line: ["Blog", "Casts"]. */
  lines: string[];
  /** Type size relative to the tile, tuned per word so all three match. */
  size?: string;
  layers?: number;
  /** Scale gap between one copy and the next at full bloom. */
  ratio?: number;
  /**
   * Seconds for the whole loop; the sound runs on the same clock. Defaults to
   * whatever keeps each move at 1.368s for the chosen variant.
   */
  duration?: number;
  /** Root frequency, varied per category so the three don't sound identical. */
  tone?: number;
  sound?: boolean;
  /** Which synthesised voice plays on hover. */
  voice?: KineticVoice;
}) {
  // Four moves in a loop rather than two, so each one lands at the same speed.
  const dur = duration ?? 5.4;
  const stopSound = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (sound) primeKineticAudio();
    return () => stopSound.current?.();
  }, [sound]);


  const handleEnter = () => {
    if (!sound || stopSound.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    stopSound.current = startKineticSound(dur, tone, voice);
  };

  const handleLeave = () => {
    stopSound.current?.();
    stopSound.current = null;
  };

  return (
    <span
      className="kinetic-tile"
      aria-hidden="true"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={
        {
          "--kt-size": size,
          "--kt-dur": `${dur}s`,
        } as React.CSSProperties
      }
    >
      {Array.from({ length: layers }, (_, i) => {
        // Depth 0 is the front copy. Painting back-to-front means the readable
        // one lands on top of the copies blowing past it.
        const depth = layers - 1 - i;
        return (
          <span
            key={i}
            className="kinetic-layer"
            style={
              {
                "--kt-peak": ratio ** depth,
                opacity: depth === 0 ? 1 : Math.max(0.25, 0.55 / depth),
              } as React.CSSProperties
            }
          >
            {lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </span>
        );
      })}
    </span>
  );
}
