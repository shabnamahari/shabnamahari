import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Asterisk from "@/components/Asterisk";
import ParenMedia from "@/components/ParenMedia";
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

export function generateStaticParams() {
  return PROJECTS.flatMap((project) =>
    galleryItems(project.slug).map((entry) => ({
      slug: project.slug,
      item: entry.num,
    })),
  );
}

/**
 * The gallery entry a /work/[slug]/[item] URL points at. The panels on the
 * program page are built the same way — numbered entries, captioned in order by
 * `galleryLabels` — so the caption is looked up by position, not stored twice.
 */
function getEntry(slug: string, num: string) {
  const project = getProject(slug);
  if (!project) return null;

  const entries = galleryItems(slug);
  const index = entries.findIndex((entry) => entry.num === num);
  if (index === -1) return null;

  const label = project.galleryLabels?.[index];
  return {
    project,
    num,
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
    .filter((sibling) => sibling.num !== entry.num);

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

        {entry.roles ? (
          <RevealLine
            delay={0.13}
            className="text-note text-muted-ink max-w-[40ch] px-[15px] text-center"
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
        <Link
          href="/auth"
          className="group relative block overflow-hidden text-center"
        >
          {/*
           * leading-[1.25], where .text-h2 sets 1. At 1 the serif's ascenders
           * stand outside their own line box, so the copy waiting below at
           * 105% had its letter-tops showing above the visible line. Given a
           * line box that contains them, the waiting copy clears the frame and
           * the offset can be a plain 100%.
           */}
          <span className="text-h2 text-confirm ease-custom-text-links block leading-[1.25] transition-all duration-700 group-hover:-translate-y-full">
            Set Up Your Account
          </span>
          <span className="text-h2 text-confirm ease-custom-text-links absolute top-0 left-0 block w-full translate-y-full leading-[1.25] transition-all duration-700 group-hover:translate-y-0">
            Set Up Your Account
          </span>
        </Link>

        <div className="flex flex-col items-center gap-y-[18px]">
          <RevealLine className="text-note text-confirm text-center">
            Other {heading.toLowerCase()} in {project.name}
          </RevealLine>
          {/*
           * The captions' entrance again, this time thrown by the scroll. The
           * stagger runs on a word count carried across the whole row rather
           * than restarting at each link, so the six titles arrive as one wave
           * instead of six that collide.
           */}
          {/*
           * One centred line. Five titles at note size measure comfortably
           * inside a laptop, so only phones are given leave to wrap — there the
           * row would otherwise have to shrink to a size nobody could read.
           */}
          <RevealOnView
            as="ul"
            className="text-note flex flex-wrap justify-center gap-x-[1.5em] gap-y-[0.7em] text-center md:flex-nowrap md:whitespace-nowrap"
          >
            {siblings.map((sibling, i) => (
              <li key={sibling.num}>
                <Link href={sibling.href} className="body-link text-confirm">
                  <TextRevealH
                    text={sibling.title}
                    startIndex={siblings
                      .slice(0, i)
                      .reduce((n, s) => n + s.title.split(" ").length, 0)}
                  />
                </Link>
              </li>
            ))}
          </RevealOnView>
        </div>
      </div>
    </div>
  );
}
