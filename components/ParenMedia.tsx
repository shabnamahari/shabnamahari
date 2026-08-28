import Link from "next/link";

export default function ParenMedia({
  children,
  onClick,
  href,
  label = "Open media",
  sizeClassName = "h-[calc(0.9em-1.6vw)]",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  /** When set, the media becomes a link instead of a button. */
  href?: string;
  label?: string;
  sizeClassName?: string;
}) {
  const mediaClassName = `relative inline-block aspect-square ${sizeClassName} overflow-hidden bg-media-gray align-middle`;

  return (
    <span className="relative inline-flex items-center gap-x-[calc(0.1em+1vw)] font-instrument-sans">
      <span className="inline-block -scale-x-100">)</span>
      {href ? (
        <Link href={href} aria-label={label} className={mediaClassName}>
          {children}
        </Link>
      ) : onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          className={mediaClassName}
        >
          {children}
        </button>
      ) : (
        // No link and no handler: plain media that just plays in place.
        <span className={mediaClassName}>{children}</span>
      )}
      <span className="inline-block">)</span>
    </span>
  );
}
