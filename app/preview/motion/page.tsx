import HoverExpand, { type HoverExpandImage } from "@/components/HoverExpand";

/**
 * A bench for the animated category panels — not part of the site.
 *
 * The animated one is the real thing, on the real category it belongs to: it is
 * also live on /work/pixi-beauty. The stills either side of it are categories
 * with no clip yet, so the two states can be compared in one stack.
 */

// The animated one sits second because that is the panel HoverExpand opens on
// load — so the clip is playing the moment the page appears, with no hover.
const PANELS: HoverExpandImage[] = [
  {
    href: "#",
    src: "/images/categories/blog-01-latest-updates.jpg",
    alt: "",
    code: "# 01",
    title: "Still",
    roles: "no clip yet — the panel just shows the drawing",
  },
  {
    href: "#",
    src: "/videos/categories/blog-02-ai-ielts-poster.jpg",
    video: "/videos/categories/blog-02-ai-ielts.mp4",
    alt: "",
    code: "# 02",
    title: "Animated",
    roles: "AI & IELTS — the Kling clip, cropped to the panel, nothing added",
  },
  {
    href: "#",
    src: "/images/categories/blog-03-ielts-skills.jpg",
    alt: "",
    code: "# 03",
    title: "Still",
    roles: "no clip yet",
  },
];

export default function MotionPreview() {
  return (
    <div className="page-margin flex flex-col gap-y-10 py-[120px]">
      <h1 className="text-h2">Panel motion</h1>
      <p className="text-note text-muted-ink max-w-[60ch] leading-snug">
        Hover the middle strip for the animated panel and the two either side for
        the stills. A panel only loads and plays its clip while it is open.
      </p>
      <HoverExpand images={PANELS} />
    </div>
  );
}
