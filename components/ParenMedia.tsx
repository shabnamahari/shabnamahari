import Link from "next/link";

export default function ParenMedia({
  children,
  onClick,
  href,
  label = "Open media",
  sizeClassName = "h-[calc(0.9em-1.6vw)]",
  aspectClassName = "aspect-square",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  /** When set, the media becomes a link instead of a button. */
  href?: string;
  label?: string;
  sizeClassName?: string;
  /**
   * The shape of the slot. Square is the site's default — a showreel is cut to
   * fit it. A single photograph is not: the shape has to be given the
   * photograph's own ratio, or the frame crops it.
   */
  aspectClassName?: string;
}) {
  const mediaClassName = `relative inline-block ${aspectClassName} ${sizeClassName} overflow-hidden bg-media-gray align-middle`;

  return (
    <span className="relative inline-flex items-center gap-x-[calc(0.1em+1vw)] font-nhm">
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
