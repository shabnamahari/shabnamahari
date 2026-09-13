"use client";

import { useEffect, useRef } from "react";

/**
 * Placeholder for a video the user will supply later.
 *
 * To use a real video: drop the file in `public/videos/` and pass its path,
 * e.g. <VideoSlot src="/videos/showreel/showreel.mp4" />. Until then this renders a clearly
 * marked empty slot so the spot is obvious in the layout.
 */
export default function VideoSlot({
  src,
  label = "Video",
  className = "",
  grayscale = false,
  poster,
  playbackRate = 1,
}: {
  src?: string;
  label?: string;
  className?: string;
  /** Drained to greyscale until hovered, like the site's photographs. */
  grayscale?: boolean;
  poster?: string;
  playbackRate?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Safari resets the rate when the source loads, so set it again then.
    const apply = () => {
      video.playbackRate = playbackRate;
    };

    apply();
    video.addEventListener("loadedmetadata", apply);
    return () => video.removeEventListener("loadedmetadata", apply);
  }, [playbackRate, src]);

  if (src) {
    return (
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className={`h-full w-full object-cover ${grayscale ? "media-grayscale" : ""} ${className}`}
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
