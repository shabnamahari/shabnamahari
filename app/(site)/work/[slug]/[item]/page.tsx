import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Asterisk from "@/components/Asterisk";
import ParenMedia from "@/components/ParenMedia";
import AuthLink from "@/components/AuthLink";
import FitOneLine from "@/components/FitOneLine";
import RevealLine from "@/components/RevealLine";
import RevealOnView from "@/components/RevealOnView";
import { TextRevealH } from "@/components/TitleEffects";
import {
  PROJECTS,
  getProject,
  galleryItems,
  squareImage,
} from "@/lib/projects";

type Params = { slug: string; item: string };

/**
 * The type size every entry title is set at. See the note at its use: the
 * divisor is the longest word in the whole gallery times a generous per-
 * character width, and the 80px covers the page margin plus .text-h1-2's own
 * horizontal padding, which sits inside the border box.
 */
const TITLE_FONT_SIZE = "min(12vw, calc((100vw - 80px) / 8.64))";

/**
 * The roll on the call to action. See the note at its use for the curve.
 *
 * `translate`, not `transform`: Tailwind v4's translate utilities write the
 * standalone translate property, so naming transform here transitions
 * something that never changes and the roll simply stops happening. The old
 * transition-all covered it by covering everything.
 */
const ROLL = "translate 900ms cubic-bezier(0.65, 0, 0.35, 1)";

export function generateStaticParams() {
  return PROJECTS.flatMap((project) =>
    galleryItems(project.slug).map((entry) => ({
      slug: project.slug,
      item: entry.slug,
    })),
  );
}

/**
 * The gallery entry a /work/[slug]/[item] URL points at. The panels on the
 * program page are built the same way — entries in order, captioned by
 * `galleryLabels` — so the caption is looked up by position, not stored twice.
 * The URL segment itself is a name rather than that position, so a shared link
 * keeps pointing at the same entry when the gallery is reordered.
 */
function getEntry(slug: string, item: string) {
  const project = getProject(slug);
  if (!project) return null;

  const entries = galleryItems(slug);
  const index = entries.findIndex((entry) => entry.slug === item);
  if (index === -1) return null;

  const label = project.galleryLabels?.[index];
  const { num } = entries[index];
  return {
    project,
    num,
    slug: entries[index].slug,
    title: label?.title ?? `( ${num} )`,
    roles: label?.roles,
    image: label?.image ?? entries[index].image,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug, item } = await params;
  const entry = getEntry(slug, item);
  return {
    title: entry ? `${entry.title} — Shabnam Ahari` : "Shabnam Ahari",
  };
}

export default async function GalleryItemPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug, item } = await params;
  const entry = getEntry(slug, item);
  if (!entry) notFound();

  const { project } = entry;
  const heading = project.galleryHeading ?? "Gallery";

  const siblings = galleryItems(slug)
    .map((sibling, i) => ({
      ...sibling,
      title: project.galleryLabels?.[i]?.title ?? `( ${sibling.num} )`,
    }))
    .filter((sibling) => sibling.slug !== entry.slug);

  // Shared by the fitted row and the wrapped one. The stagger runs on a word
  // count carried across the whole row rather than restarting at each link, so
  // the titles arrive as one wave instead of five that collide.
  const siblingLinks = siblings.map((sibling, i) => (
    <li key={sibling.slug}>
      <Link href={sibling.href} className="body-link text-confirm">
        <TextRevealH
          text={sibling.title}
          startIndex={siblings
            .slice(0, i)
            .reduce((n, s) => n + s.title.split(" ").length, 0)}
        />
      </Link>
    </li>
  ));

  // One size for every entry title on every page. Sizing each title to its own
  // longest word made "Healthcare" tower over "Engineering & Construction", so
  // the budget is the worst case across the whole gallery — "Construction", at
  // twelve characters — and every page is set to what that word needs.
  //
  // 0.72em per uppercase character is deliberately generous; the widest real
  // word measures nearer 0.67. Overestimating costs slightly smaller type,
  // underestimating costs a word with its end sliced off.

  return (
    <div className="flex flex-col gap-y-[100px] pb-[100px] md:gap-y-[200px] md:pb-[200px]">
      {/* hero: ✳ ( photograph ) + the entry's own title */}
      <section className="flex min-h-[100svh] w-full flex-col items-center justify-center gap-y-6 overflow-hidden py-[15px]">
        <div className="relative flex shrink-0 items-center px-16 md:px-28">
          <span className="absolute left-16 md:left-24 w-[calc((0.9em+2.7vw)*1.5)] max-md:w-10 -translate-x-full pt-1 text-confirm">
            <Asterisk />
          </span>
          {/*
           * The slot keeps the site's square. Squaring a 1200×2000 frame costs
           * two fifths of it, so the cost is paid once in `square/` — cut by
           * eye per illustration — rather than by a focal point guessed here.
           * The colour is on the wrapper so the parentheses take it; the
           * photograph inside is unaffected.
           */}
          <RevealLine className="text-h1 text-confirm flex items-center justify-center font-bold">
            <ParenMedia>
              <Image
                src={squareImage(entry.image)}
                alt={entry.title}
                fill
                sizes="(min-width: 768px) 25vw, 40vw"
                unoptimized
                className="media-grayscale object-cover"
              />
            </ParenMedia>
          </RevealLine>
          <span className="text-note text-muted-ink absolute right-28 top-1/2 max-md:hidden -translate-y-1/2 translate-x-full pl-[1vw] md:pl-[1.5vw]">
            # {entry.num}
          </span>
        </div>

        <div className="flex w-full justify-center overflow-hidden">
          <RevealLine
            as="h1"
            delay={0.0667}
            /*
             * The measure has to be at least as wide as the longest word can
             * be set, or .text-h1-2's `overflow: hidden` slices the end off it
             * — a word cannot wrap inside itself. Since the size above is
             * derived from that same width, the two agree by construction and
             * the clip can never catch a word.
             */
            className="text-h1-2 text-confirm max-w-[calc(100vw-60px)] text-center"
          >
            {/*
             * The padding belongs on the moving element, not on the clip.
             *
             * At line-height 0.78 the capitals stand taller than their own line
             * box, so the tops of the first line were being shaved and the
             * block needed vertical room. Put on the wrapper it opened the clip
             * instead: the reveal parks the text one full height down, which is
             * exactly the bottom of the *content* box, so anything padded
             * beyond that showed the tops of the letters as a row of dashes.
             * Here it is part of what moves, so the resting state clears the
             * clip completely and the letters still get their room.
             */}
            <span
              style={{
                display: "block",
                fontSize: TITLE_FONT_SIZE,
                paddingBlock: "0.14em",
                textWrap: "balance",
              }}
            >
              {entry.title}
            </span>
          </RevealLine>
        </div>

        {/* One line: the longest roles list is around sixty characters, which
            at note size fits a laptop with room over. Phones keep the measure
            and wrap, rather than shrink to something unreadable. */}
        {entry.roles ? (
          <RevealLine
            delay={0.13}
            className="text-note text-muted-ink max-w-[40ch] px-[15px] text-center md:max-w-none md:whitespace-nowrap"
          >
            {entry.roles}
          </RevealLine>
        ) : null}

        {/*
         * The gallery captions' own entrance — words in from the right, skewed
         * and transparent. There it is armed by a panel opening; the hero here
         * is on screen the moment the page is, so the flag is simply set, and
         * the stagger's head start is what holds the line back until the title
         * has landed.
         */}
        <div data-active="true" className="text-note text-muted-ink">
          <TextRevealH text="( in production )" startIndex={3} />
        </div>
      </section>

      {/*
       * The one way forward, and then the rest of the program kept deliberately
       * quiet beneath it. Every sibling is also in production, so a stack of
       * six full-size links would be a carousel of this same page; at note size
       * the row says "there is more here" without pretending to be the point.
       */}
      <div className="page-margin flex flex-col items-center gap-y-[60px]">
        <AuthLink
          from={{ href: `/work/${slug}/${entry.slug}`, label: entry.title }}
          className="group relative block overflow-hidden text-center"
        >
          {/*
           * leading-[1.4], where .text-h2 sets 1.
           *
           * The number is not taste. Instrument Serif declares an ascent of
           * 0.99em and a descent of 0.31em, so its glyphs occupy 1.30em — at
           * line-height 1 they stand 0.15em outside their own line box top and
           * bottom. The box the roll-up clips to is that line box, so the copy
           * waiting below showed the top of its p through the floor, and the
           * visible copy had its ascenders shaved at the ceiling.
           *
           * 1.3 is therefore break-even and 1.4 leaves 0.05em of margin either
           * side, which is what lets the offset be a plain 100%.
           *
           * Set inline, not as leading-[1.4]. Tailwind's utilities live in
           * @layer utilities and .text-h2 is written outside any layer, and
           * unlayered rules beat layered ones however specific the layered one
           * is — so the utility lost to .text-h2's line-height: 1 silently.
           *
           * The transition is inline for the same reason, and on a different
           * curve from the site's other links. ease-custom-text-links is
           * cubic-bezier(0.98, 0, 0.02, 1), which holds near its start for most
           * of the duration, crosses almost the whole distance at once, then
           * holds again — so it reads as a snap however long it is given, and
           * lengthening it only lengthens the pause. This curve spends its time
           * travelling instead, which is what makes a roll legible as rolling.
           */}
          <span
            style={{ lineHeight: 1.4, transition: ROLL }}
            className="text-h2 text-confirm block group-hover:-translate-y-full"
          >
            Set Up Your Account
          </span>
          <span
            style={{ lineHeight: 1.4, transition: ROLL }}
            className="text-h2 text-confirm absolute top-0 left-0 block w-full translate-y-full group-hover:translate-y-0"
          >
            Set Up Your Account
          </span>
        </AuthLink>

        <div className="flex w-full flex-col items-center gap-y-[18px]">
          <RevealLine className="text-note text-confirm text-center">
            Other {heading} in{" "}
            <Link href={`/work/${slug}`} className="body-link">
              {project.name}
            </Link>
          </RevealLine>
          {/*
           * One centred line, shrunk to whatever size that takes. The gap is in
           * `em`, so it comes down with the type rather than eating the room
           * that was just freed. Phones get the wrapped row instead: fitting
           * six IELTS titles across 375px would leave them unreadable.
           */}
          <FitOneLine max={21} min={11} className="max-md:hidden">
            <RevealOnView
              as="ul"
              className="flex flex-nowrap justify-center gap-x-[1.5em] whitespace-nowrap"
            >
              {siblingLinks}
            </RevealOnView>
          </FitOneLine>
          <RevealOnView
            as="ul"
            className="text-note flex flex-wrap justify-center gap-x-[1.5em] gap-y-[0.7em] text-center md:hidden"
          >
            {siblingLinks}
          </RevealOnView>
        </div>
      </div>
    </div>
  );
}
