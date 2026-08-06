import Image from "next/image";

/**
 * A reel built from a program's category photographs, for the showreel slot on
 * /services. Three treatments, all pure CSS over a stack of frames:
 *
 * - "cut"  — slow Ken Burns push on each photo, hard cut to the next, on the
 *            same 1.16s beat as the kinetic tiles.
 * - "mask" — the same reel playing inside the letterforms of the program word.
 * - "fade" — long dwell, soft cross-fade, the calmest of the three.
 */
export default function ShowReel({
  images,
  word,
  treatment = "cut",
  beat,
  size = "14.5cqw",
  alt,
}: {
  images: string[];
  /** Only used by the "mask" treatment. */
  word?: string;
  treatment?: "cut" | "mask" | "fade";
  /** Seconds each photo holds; the loop is this times the number of photos. */
  beat?: number;
  /** Mask type size. In cqw, not cqmin, so it fits the box at any aspect. */
  size?: string;
  alt: string;
}) {
  // The cut treatment rides the tiles' 1.16s beat; the fade is meant to breathe,
  // so it holds each photo far longer unless told otherwise.
  const dwell = beat ?? (treatment === "fade" ? 2.4 : 1.16);
  const duration = dwell * images.length;

  return (
    <span
      className={`reel reel--${treatment}`}
      style={
        {
          "--reel-dur": `${duration}s`,
          "--reel-size": size,
        } as React.CSSProperties
      }
    >
      {images.map((src, i) => {
        const delay = `calc(var(--reel-dur) / ${images.length} * ${i})`;

        if (treatment === "mask") {
          return (
            <span
              key={src}
              className="reel-frame reel-word"
              aria-hidden="true"
              style={{
                animationDelay: delay,
                backgroundImage: `url(${src})`,
              }}
            >
              {word}
            </span>
          );
        }

        return (
          <span key={src} className="reel-frame" style={{ animationDelay: delay }}>
            <Image
              src={src}
              alt={i === 0 ? alt : ""}
              fill
              sizes="(min-width: 1024px) 50vw, 90vw"
              unoptimized
              className="object-cover"
            />
          </span>
        );
      })}
    </span>
  );
}
