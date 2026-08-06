import ShowReel from "@/components/ShowReel";

/**
 * Temporary comparison of the three showreel treatments, using the Blogcasts
 * photographs. Delete once one is chosen.
 */
const BLOGCASTS = [
  "/images/categories/blog-01-latest-updates.jpg",
  "/images/categories/blog-02-ai-ielts.jpg",
  "/images/categories/blog-03-ielts-skills.jpg",
  "/images/categories/blog-04-career-english.jpg",
  "/images/categories/blog-05-learning-paths.jpg",
  "/images/categories/blog-06-band-score-explained.jpg",
];

const TREATMENTS: {
  id: "cut" | "mask" | "fade";
  title: string;
  note: string;
  beat?: number;
}[] = [
  {
    id: "cut" as const,
    title: "۱ — کن‌برنز با برش سخت",
    note: "هر عکس آرام زوم می‌خورد، بعد برش تیز. روی همان ضرب ۱٫۱۶ ثانیه‌ای کاشی‌ها. پیشنهاد من.",
  },
  {
    id: "mask" as const,
    title: "۲ — ماسک‌شده در تایپ",
    note: "همان ریل، ولی از داخل حروف کلمه دیده می‌شود.",
  },
  {
    id: "fade" as const,
    title: "۳ — کراس‌فید آرام (انتخاب‌شده)",
    note: "مکث بلندتر روی هر عکس، تعویض نرم. الان هر عکس ۲٫۴ ثانیه می‌ماند، کل لوپ ۱۴٫۴ ثانیه.",
    beat: 2.4,
  },
];

export default function ReelPreview() {
  return (
    <main className="page-margin flex min-h-screen flex-col gap-y-16 py-24">
      <div className="flex flex-col gap-y-3">
        <h1 className="text-h3">Showreel — three treatments</h1>
        <p className="text-body max-w-[62ch] text-muted-ink">
          All three run on the six Blogcasts photographs. Photography is
          greyscale and comes up in colour on hover, like the rest of the site.
        </p>
      </div>

      {TREATMENTS.map(({ id, title, note, beat }) => (
        <section key={id} className="flex flex-col gap-y-5">
          <h2 className="text-note">{title}</h2>
          <p className="text-body max-w-[62ch] text-muted-ink">{note}</p>
          <div className="flex flex-wrap items-end gap-10">
            <span className="relative block aspect-square w-[380px] overflow-hidden bg-media-gray">
              <ShowReel
                images={BLOGCASTS}
                word="Blogcasts"
                treatment={id}
                beat={beat}
                alt="Blogcasts"
              />
            </span>
            <span className="relative block aspect-video w-[560px] overflow-hidden bg-media-gray">
              <ShowReel
                images={BLOGCASTS}
                word="Blogcasts"
                treatment={id}
                beat={beat}
                alt="Blogcasts"
              />
            </span>
          </div>
        </section>
      ))}
    </main>
  );
}
