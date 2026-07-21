export type Project = {
  slug: string;
  name: string;
  /** Wide cover shown on /services */
  cover: string;
  description: string;
};

export const GALLERY_COUNT = 6;

export const PROJECTS: Project[] = [
  {
    slug: "toty",
    name: "TOTY",
    cover: "https://picsum.photos/seed/adcker-toty/1454/816",
    description:
      "TOTY’s 360° social media engine, from strategy to execution, their right hand for building brand identity and digital presence across Instagram, TikTok, Facebook, UGC, paid media, and beyond.",
  },
  {
    slug: "pixi-beauty",
    name: "Pixi Beauty",
    cover: "https://picsum.photos/seed/adcker-pixi/1454/816",
    description:
      "A full-funnel social presence for Pixi Beauty, pairing editorial product storytelling with creator-led content that turns discovery into loyalty.",
  },
  {
    slug: "pacifica-beauty",
    name: "Pacifica Beauty",
    cover: "https://picsum.photos/seed/adcker-pacifica/1454/816",
    description:
      "Clean-beauty storytelling for Pacifica, built on community-first content, always-on social management, and campaigns that make the brand impossible to scroll past.",
  },
];

/**
 * Which project each homepage category links to, in page order:
 * Beauty → first, Fashion → second, Wellness → third.
 */
export const HOMEPAGE_LINKS = {
  beauty: `/work/${PROJECTS[0].slug}`,
  fashion: `/work/${PROJECTS[1].slug}`,
  wellness: `/work/${PROJECTS[2].slug}`,
};

export function getProject(slug: string) {
  return PROJECTS.find((p) => p.slug === slug);
}

export function galleryItems(slug: string) {
  return Array.from({ length: GALLERY_COUNT }, (_, i) => {
    const num = String(i + 1).padStart(2, "0");
    return {
      num,
      href: `/work/${slug}/${num}`,
      image: `https://picsum.photos/seed/adcker-${slug}-${num}/600/1000`,
    };
  });
}
