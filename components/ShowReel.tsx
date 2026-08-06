import Image from "next/image";

/**
 * A program's photographs as a slow cross-fade. Each photo holds for `beat`
 * seconds and dissolves into the next; the loop is that times the number of
 * photos. Greyscale like the rest of the site's media, colour on hover.
 */
export default function ShowReel({
  images,
  frames,
  beat = 0.5,
  focus = "center",
  alt,
}: {
  images?: string[];
  /** Cross-fade arbitrary elements instead of photographs. */
  frames?: React.ReactNode[];
  /** Seconds each photo holds before dissolving into the next. */
  beat?: number;
  /**
   * Which part of each photograph survives the crop. A square frame cuts a
   * standing portrait somewhere, and centre puts that cut across the face —
   * so portraits pass a value nearer the top.
   */
  focus?: string;
  alt: string;
}) {
  const cells: React.ReactNode[] =
    frames ??
    (images ?? []).map((src, i) => (
      <Image
        key={src}
        src={src}
        alt={i === 0 ? alt : ""}
        fill
        sizes="(min-width: 1024px) 50vw, 90vw"
        unoptimized
        style={{ objectPosition: focus }}
        className="object-cover"
      />
    ));

  const duration = beat * cells.length;

  // The cross-fade shape has to be derived from the number of photographs, not
  // assumed. Hard-coding it for six left a three-photo reel dark for a third of
  // every loop, because each frame faded out a sixth of the way through a slot
  // that was actually a third long.
  //
  // The fade-in and fade-out windows are the same length and exactly one slot
  // apart, so a photo reaches full opacity at the same instant the one before
  // it reaches zero: the two always sum to one and the frame never dips dark.
  const slot = 100 / cells.length;
  const keyframes = `@keyframes reel-fade-${cells.length} {
    0% { opacity: 0; transform: scale(1.02); }
    ${(slot * 0.12).toFixed(2)}% { opacity: 1; }
    ${slot.toFixed(2)}% { opacity: 1; }
    ${(slot * 1.12).toFixed(2)}% { opacity: 0; }
    100% { opacity: 0; transform: scale(1.14); }
  }`;

  return (
    <span
      className="reel"
      style={{ "--reel-dur": `${duration}s` } as React.CSSProperties}
    >
      <style>{keyframes}</style>
      {cells.map((cell, i) => (
        <span
          key={i}
          className="reel-frame"
          style={{
            animationName: `reel-fade-${cells.length}`,
            animationDelay: `calc(var(--reel-dur) / ${cells.length} * ${i})`,
          }}
        >
          {cell}
        </span>
      ))}
    </span>
  );
}
