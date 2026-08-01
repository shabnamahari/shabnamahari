export type GalleryLabel = {
  title: string;
  /** Optional secondary line, shown in muted ink next to the title. */
  roles?: string;
};

export type Project = {
  slug: string;
  name: string;
  /** Wide cover shown on /services */
  cover: string;
  description: string;
  /** Replaces the "( 01 )" gallery numbering with a caption, in order. */
  galleryLabels?: GalleryLabel[];
  /** Heading above the gallery grid. Defaults to "Gallery". */
  galleryHeading?: string;
};

export const GALLERY_COUNT = 6;

export const PROJECTS: Project[] = [
  {
    slug: "toty",
    name: "Ielts",
    cover: "https://picsum.photos/seed/adcker-toty/1454/816",
    description:
      "Most preparation starts with a syllabus. Yours starts with a diagnosis. Half a band is a whole life — a visa, an admission, a career — and I build the plan that closes that exact gap.",
    galleryHeading: "Programs",
    galleryLabels: [
      { title: "Placement Assessment" },
      { title: "Skills for Band Score 6.5" },
      { title: "Skills for Band Score 7 and Above" },
      { title: "Grammar and Vocabulary" },
      { title: "AI & Ielts" },
      { title: "Plan Tracker" },
    ],
  },
  {
    slug: "pixi-beauty",
    name: "Blogposts",
    cover: "https://picsum.photos/seed/adcker-pixi/1454/816",
    description:
      "What's changing in the exam, how AI actually fits into your prep, and how the scoring really works.",
    galleryHeading: "Insights",
    galleryLabels: [
      { title: "Latest IELTS Updates" },
      { title: "AI & IELTS" },
      { title: "IELTS Skills" },
      { title: "Career English" },
      { title: "Learning Paths" },
      { title: "Band Score Explained" },
    ],
  },
  {
    slug: "pacifica-beauty",
    name: "Business English",
    cover: "https://picsum.photos/seed/adcker-pacifica/1454/816",
    description:
      "Nobody grades your English at work — your next promotion does. Whether that's a client call, a negotiation or a life abroad, I build the English around it.",
    galleryHeading: "Areas",
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
 * Which project each homepage service card links to, in page order:
 * Ielts → first, Blogposts → second, Business English → third.
 */
export const HOMEPAGE_LINKS = {
  ielts: `/work/${PROJECTS[0].slug}`,
  blogposts: `/work/${PROJECTS[1].slug}`,
  businessEnglish: `/work/${PROJECTS[2].slug}`,
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
