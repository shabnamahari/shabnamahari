export type GalleryLabel = {
  title: string;
  /**
   * The URL segment for this entry. Defaults to the title, slugified — set it
   * only where that reads badly, as "Skills for Band Score 7 and Above" does.
   */
  slug?: string;
  /** Optional secondary line, shown in muted ink next to the title. */
  roles?: string;
  /** Overrides the generated picsum placeholder with a real local image. */
  image?: string;
  /**
   * An animated cut of `image`, played only while this panel is open. Optional
   * per category, so the clips can land one at a time — a category without one
   * shows its still and nothing else changes.
   */
  video?: string;
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
  /**
   * The noun this project calls its gallery entries — "Programs", "Insights",
   * "Areas". Kept bare because the entry pages set it mid-sentence ("Other
   * programs in Ielts"), where the heading's "All" would not fit. Use
   * `galleryTitle` for the heading itself. Defaults to "Gallery".
   */
  galleryHeading?: string;
};

/**
 * The heading above the gallery grid: the noun with "All" in front of it. The
 * fallback stands alone — "All Gallery" is not English.
 */
export function galleryTitle(project: Project) {
  return project.galleryHeading ? `All ${project.galleryHeading}` : "Gallery";
}

export const GALLERY_COUNT = 6;

export const PROJECTS: Project[] = [
  {
    slug: "ielts",
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
        slug: "band-6-5",
        image: "/images/categories/ielts-02-band-6.5.jpg",
      },
      {
        title: "Skills for Band Score 7 and Above",
        slug: "band-7-plus",
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
    slug: "blogcasts",
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
        video: "/videos/categories/blog-02-ai-ielts.mp4",
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
    slug: "business-english",
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

/**
 * The URL segment a gallery title reduces to: lowercase, ampersands spelled
 * out, and every other run of non-alphanumerics collapsed to one hyphen.
 * "AI & Ielts" becomes "ai-and-ielts".
 */
function slugifyTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The six gallery entries of a program, in order.
 *
 * `num` is what the pages print ("# 03"); `slug` is what the URL carries. They
 * were one value until the URLs were named, and keeping them apart is the whole
 * point: the numbering is positional, so reordering the gallery used to
 * silently repoint every link ever shared. A link to
 * /work/ielts/placement-assessment survives being moved down the list.
 */
export function galleryItems(slug: string) {
  const labels = getProject(slug)?.galleryLabels;

  return Array.from({ length: GALLERY_COUNT }, (_, i) => {
    const num = String(i + 1).padStart(2, "0");
    const label = labels?.[i];
    // An unlabelled entry has no title to name it, so it keeps its number.
    const item = label ? (label.slug ?? slugifyTitle(label.title)) : num;

    return {
      num,
      slug: item,
      href: `/work/${slug}/${item}`,
      image: `https://picsum.photos/seed/${slug}-${num}/600/1000`,
    };
  });
}
