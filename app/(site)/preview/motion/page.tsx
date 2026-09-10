import HoverExpand, { type HoverExpandImage } from "@/components/HoverExpand";

/**
 * A bench for the animated category panels — not part of the site.
 *
 * All three are the real thing, on the real categories they belong to, and all
 * three are live on /learn/blogcasts. They were a still/animated/still stack
 * while blog-02 was the only category with a clip; now that every Blogcasts
 * panel has one, the comparison this bench offers is between clips rather than
 * between the two states.
 *
 * The one category still on its drawing alone is Placement Assessment, over on
 * /learn/ielts — there is no Blogcasts panel left to show that case.
 */

// blog-02 sits second because that is the panel HoverExpand opens on load — so
// a clip is playing the moment the page appears, with no hover.
const PANELS: HoverExpandImage[] = [
  {
    href: "#",
    src: "/images/categories/blog-01-latest-updates.jpg",
    video: "/videos/categories/blog-01-latest-updates.mp4",
    alt: "",
    code: "# 01",
    title: "Animated",
    roles: "Latest IELTS Updates — the crowd, cut from a 9:16 matte on white",
  },
  {
    href: "#",
    src: "/images/categories/blog-02-ai-ielts.jpg",
    video: "/videos/categories/blog-02-ai-ielts.mp4",
    alt: "",
    code: "# 02",
    title: "Animated",
    roles: "AI & IELTS — the Veo clip, cropped to the panel, nothing added",
  },
  {
    href: "#",
    src: "/images/categories/blog-03-ielts-skills.jpg",
    video: "/videos/categories/blog-03-ielts-skills.mp4",
    alt: "",
    code: "# 03",
    title: "Animated",
    roles: "IELTS Skills — same matte, same window",
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
