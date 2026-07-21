/**
 * Placeholder for a video the user will supply later.
 *
 * To use a real video: drop the file in `public/videos/` and pass its path,
 * e.g. <VideoSlot src="/videos/hero.mp4" />. Until then this renders a clearly
 * marked empty slot so the spot is obvious in the layout.
 */
export default function VideoSlot({
  src,
  label = "Video",
  className = "",
}: {
  src?: string;
  label?: string;
  className?: string;
}) {
  if (src) {
    return (
      <video
        src={src}
        autoPlay
        muted
        loop
        playsInline
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-media-gray ${className}`}
    >
      <span className="text-note text-ink/40 text-[10px] leading-none tracking-wide uppercase">
        {label}
      </span>
    </div>
  );
}
