export default function ParenMedia({
  children,
  onClick,
  sizeClassName = "h-[calc(0.9em-1.6vw)]",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  sizeClassName?: string;
}) {
  return (
    <span className="relative inline-flex items-center gap-x-[calc(0.1em+1vw)] font-nhm">
      <span className="inline-block -scale-x-100">)</span>
      <button
        type="button"
        onClick={onClick}
        aria-label="Open media"
        className={`relative inline-block aspect-square ${sizeClassName} overflow-hidden bg-media-gray align-middle`}
      >
        {children}
      </button>
      <span className="inline-block">)</span>
    </span>
  );
}
