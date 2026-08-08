export type GalleryLabel = {
  title: string;
  /** Optional secondary line, shown in muted ink next to the title. */
  roles?: string;
  /** Overrides the generated picsum placeholder with a real local image. */
  image?: string;
};

export type Project = {
  slug: string;
  name: string;
  /**
   * The word as the kinetic tile sets it, one entry per line, plus the root
   * frequency of its hover sound. Shared so the homepage and /services can't
   * drift apart; only the type size differs between the two, since one tile is
   * small and square and the other is wide.
   */
  tile: { lines: string[]; tone: number };
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
    tile: { lines: ["IELTS"], tone: 146 },
    cover: "https://picsum.photos/seed/adcker-toty/1454/816",
    description:
      "Most preparation starts with a syllabus. Yours starts with a diagnosis. Half a band is a whole life — a visa, an admission, a career — and I build the plan that closes that exact gap.",
    galleryHeading: "Programs",
    galleryLabels: [
      {
        title: "Placement Assessment",
        image: "/images/categories/ielts-01-placement-assessment.jpg",
      },
      {
        title: "Skills for Band Score 6.5",
        image: "/images/categories/ielts-02-band-6.5.jpg",
      },
      {
        title: "Skills for Band Score 7 and Above",
        image: "/images/categories/ielts-03-band-7-plus.jpg",
      },
      {
        title: "Grammar and Vocabulary",
        image: "/images/categories/ielts-04-grammar-vocab.jpg",
      },
      {
        title: "AI & Ielts",
        image: "/images/categories/ielts-05-ai-ielts.jpg",
      },
      {
        title: "Plan Tracker",
        image: "/images/categories/ielts-06-plan-tracker.jpg",
      },
    ],
  },
  {
    slug: "pixi-beauty",
    name: "Blogcasts",
    tile: { lines: ["Blog", "Casts"], tone: 174 },
    cover: "https://picsum.photos/seed/adcker-pixi/1454/816",
    description:
      "What's changing in the exam, how AI actually fits into your prep, and how the scoring really works.",
    galleryHeading: "Insights",
    galleryLabels: [
      {
        title: "Latest IELTS Updates",
        image: "/images/categories/blog-01-latest-updates.jpg",
      },
      {
        title: "AI & IELTS",
        image: "/images/categories/blog-02-ai-ielts.jpg",
      },
      {
        title: "IELTS Skills",
        image: "/images/categories/blog-03-ielts-skills.jpg",
      },
      {
        title: "Career English",
        image: "/images/categories/blog-04-career-english.jpg",
      },
      {
        title: "Learning Paths",
        image: "/images/categories/blog-05-learning-paths.jpg",
      },
      {
        title: "Band Score Explained",
        image: "/images/categories/blog-06-band-score-explained.jpg",
      },
    ],
  },
  {
    slug: "pacifica-beauty",
    name: "Business English",
    tile: { lines: ["Business", "English"], tone: 196 },
    cover: "https://picsum.photos/seed/adcker-pacifica/1454/816",
    description:
      "Nobody grades your English at work — your next promotion does. Whether that's a client call, a negotiation or a life abroad, I build the English around it.",
    galleryHeading: "Areas",
    galleryLabels: [
      {
        title: "Technology & IT",
        roles:
          "Software Engineers, Developers, Product Managers, Data Analysts",
        image: "/images/categories/be-01-tech-it.jpg",
      },
      {
        title: "Business & Management",
        roles: "Managers, Team Leaders, Executives, Entrepreneurs",
        image: "/images/categories/be-02-business-mgmt.jpg",
      },
      {
        title: "Sales & Marketing",
        roles:
          "Sales Representatives, Marketing Specialists, Digital Marketers",
        image: "/images/categories/be-03-sales-marketing.jpg",
      },
      {
        title: "Finance & Accounting",
        roles: "Accountants, Financial Analysts, Banking Professionals",
        image: "/images/categories/be-04-finance-accounting.jpg",
      },
      {
        title: "Healthcare",
        roles: "Doctors, Nurses, Pharmacists, Healthcare Professionals",
        image: "/images/categories/be-05-healthcare.jpg",
      },
      {
        title: "Engineering & Construction",
        roles: "Engineers, Project Engineers, Technical Professionals",
        image: "/images/categories/be-06-engineering.jpg",
      },
    ],
  },
];

/**
 * Which project each homepage service card links to, in page order:
 * Ielts → first, Blogcasts → second, Business English → third.
 */
export const HOMEPAGE_LINKS = {
  ielts: `/work/${PROJECTS[0].slug}`,
  blogcasts: `/work/${PROJECTS[1].slug}`,
  businessEnglish: `/work/${PROJECTS[2].slug}`,
};

export function getProject(slug: string) {
  return PROJECTS.find((p) => p.slug === slug);
}

/**
 * The photographs the hero showreel cycles, in gallery order. Falls back to the
 * generated gallery placeholders for any program without real photos yet.
 */
export function reelImages(project: Project) {
  const labelled = project.galleryLabels
    ?.map((label) => label.image)
    .filter((image): image is string => Boolean(image));

  return labelled?.length ? labelled : galleryItems(project.slug).map((i) => i.image);
}

/**
 * The 1:1 crop of a category photograph.
 *
 * The originals are all 1200×2000 and the gallery panels show them whole, so a
 * square slot cannot be fed the same file — it would throw away two fifths of
 * the frame wherever the focal point were put. Each square was therefore cut
 * once, by eye, into `square/`, and the two live side by side.
 */
export function squareImage(image: string) {
  return image.startsWith("/images/categories/")
    ? image.replace("/images/categories/", "/images/categories/square/")
    : image.replace("/600/1000", "/600/600");
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
