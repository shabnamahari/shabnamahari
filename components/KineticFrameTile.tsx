"use client";

/**
 * Design 2 of the category tiles.
 *
 * Where design 1 ([KineticTypeTile]) floats bare copies of the word, this one
 * sits each copy inside its own panel: three nested squares, each a slightly
 * different shade of ink so the depth is legible, with the word centred in each.
 * Because a panel is opaque and its word is wider than the panel in front of it,
 * the outer words read as fragments around the edges — the structure in the
 * motion reference.
 *
 * The whole stack pushes forward together and comes back, so the centre word
 * grows and shrinks too rather than sitting still.
 * Only <span>s — this renders inside a link that lives in running text.
 */
export default function KineticFrameTile({
  lines,
  size = "14.4cqmin",
  frame = "52cqmin",
  layers = 3,
  ratio = 1.7,
  zoom = 1.6,
  duration = 3.6,
}: {
  /** The category word, one entry per line: ["Blog", "Casts"]. */
  lines: string[];
  /** Type size relative to the tile. */
  size?: string;
  /** Width of the innermost panel, relative to the tile. */
  frame?: string;
  layers?: number;
  /** Size gap from one panel to the next one out. */
  ratio?: number;
  /** How far the stack pushes forward at the peak of the loop. */
  zoom?: number;
  duration?: number;
}) {
  // Indexed by depth, so the front panel is the deepest tone and each one
  // behind it steps lighter. That shade difference is what separates the panels
  // without needing outlines, and it keeps the readable word on the darkest
  // ground.
  const shades = ["#0d0d0d", "#1f1f1f", "#333333"];

  return (
    <span
      className="kinetic-tile kinetic-tile--framed"
      aria-hidden="true"
      style={
        {
          "--kt-size": size,
          "--kt-frame": frame,
          "--kt-zoom": zoom,
          "--kt-dur": `${duration}s`,
        } as React.CSSProperties
      }
    >
      <span className="kinetic-stage">
        {Array.from({ length: layers }, (_, i) => {
          // Depth 0 is the front panel; the ones behind step up in size.
          const depth = layers - 1 - i;
          return (
            <span
              key={i}
              className="kinetic-frame"
              style={
                {
                  "--kt-depth": ratio ** depth,
                  "--kt-shade": shades[Math.min(depth, shades.length - 1)],
                } as React.CSSProperties
              }
            >
              <span className="kinetic-word">
                {lines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
