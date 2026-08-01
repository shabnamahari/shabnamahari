export type GalleryLabel = {
  title: string;
  roles: string;
};

export type Project = {
  slug: string;
  name: string;
  /** Wide cover shown on /services */
  cover: string;
  description: string;
  /** Replaces the "( 01 )" gallery numbering with a field + roles caption, in order. */
  galleryLabels?: GalleryLabel[];
};

export const GALLERY_COUNT = 6;

export const PROJECTS: Project[] = [
  {
    slug: "toty",
    name: "IELTS",
    cover: "https://picsum.photos/seed/adcker-toty/1454/816",
    description:
      "TOTY’s 360° social media engine, from strategy to execution, their right hand for building brand identity and digital presence across Instagram, TikTok, Facebook, UGC, paid media, and beyond.",
  },
  {
    slug: "pixi-beauty",
    name: "Blogposts",
    cover: "https://picsum.photos/seed/adcker-pixi/1454/816",
    description:
      "A full-funnel social presence for Pixi Beauty, pairing editorial product storytelling with creator-led content that turns discovery into loyalty.",
  },
  {
    slug: "pacifica-beauty",
    name: "Business English",
    cover: "https://picsum.photos/seed/adcker-pacifica/1454/816",
    description:
      "Nobody grades your English at work — your next promotion does. Whether that's a client call, a negotiation or a life abroad, I build the English around it.",
    galleryLabels: [
      {
        title: "Technology & IT",
        roles:
          "Software Engineers, Developers, Product Managers, Data Analysts",
      },
      {
        title: "Business & Management",
        roles: "Managers, Team Leaders, Executives, Entrepreneurs",
      },
      {
        title: "Sales & Marketing",
        roles:
          "Sales Representatives, Marketing Specialists, Digital Marketers",
      },
      {
        title: "Finance & Accounting",
        roles: "Accountants, Financial Analysts, Banking Professionals",
      },
      {
        title: "Healthcare",
        roles: "Doctors, Nurses, Pharmacists, Healthcare Professionals",
      },
      {
        title: "Engineering & Construction",
        roles: "Engineers, Project Engineers, Technical Professionals",
      },
    ],
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
