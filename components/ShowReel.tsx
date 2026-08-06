import Image from "next/image";

/**
 * A program's photographs as a slow cross-fade. Each photo holds for `beat`
 * seconds and dissolves into the next; the loop is that times the number of
 * photos. Greyscale like the rest of the site's media, colour on hover.
 */
export default function ShowReel({
  images,
  beat = 0.5,
  alt,
}: {
  images: string[];
  /** Seconds each photo holds before dissolving into the next. */
  beat?: number;
  alt: string;
}) {
  const duration = beat * images.length;

  return (
    <span
      className="reel"
      style={{ "--reel-dur": `${duration}s` } as React.CSSProperties}
    >
      {images.map((src, i) => (
        <span
          key={src}
          className="reel-frame"
          style={{
            animationDelay: `calc(var(--reel-dur) / ${images.length} * ${i})`,
          }}
        >
          <Image
            src={src}
            alt={i === 0 ? alt : ""}
            fill
            sizes="(min-width: 1024px) 50vw, 90vw"
            unoptimized
            className="object-cover"
          />
        </span>
      ))}
    </span>
  );
}
