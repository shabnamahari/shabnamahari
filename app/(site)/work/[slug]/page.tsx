import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import HoverExpand from "@/components/HoverExpand";
import RevealLine from "@/components/RevealLine";
import Asterisk from "@/components/Asterisk";
import ParenMedia from "@/components/ParenMedia";
import ShowReel from "@/components/ShowReel";
import {
  PROJECTS,
  getProject,
  galleryItems,
  galleryTitle,
  reelImages,
} from "@/lib/projects";

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  return {
    title: project ? `${project.name} — Shabnam Ahari` : "Shabnam Ahari",
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const others = PROJECTS.filter((p) => p.slug !== project.slug);

  const galleryPanels = galleryItems(project.slug).map((item, i) => {
    const label = project.galleryLabels?.[i];
    return {
      href: item.href,
      src: label?.image ?? item.image,
      alt: label?.title ?? `${project.name} ${item.num}`,
      code: `# ${item.num}`,
      title: label?.title ?? `( ${item.num} )`,
      roles: label?.roles,
      video: label?.video,
    };
  });

  // The name is dynamic (any project), so the size must guarantee a fit
  // rather than assume a short single word: cap at the character width this
  // font/weight/tracking actually renders (≈0.534× font-size per glyph),
  // never letting it grow past the usual 12vw display size either.
  const nameFontSize = `min(12vw, calc((100vw - 40px) / ${(
    project.name.length * 0.534
  ).toFixed(2)}))`;

  return (
    <div className="flex flex-col gap-y-[100px] pb-[100px] md:gap-y-[200px] md:pb-[200px]">
      {/* hero: ✳ ( video ) + name */}
      <h1 className="hero-stack [--hero-lines:2]">
        <div className="relative flex shrink-0 items-center px-16 md:px-28">
          <span className="absolute left-16 md:left-24 w-[calc((0.9em+2.7vw)*1.5)] max-md:w-10 -translate-x-full pt-1 text-ink">
            <Asterisk />
          </span>
          <RevealLine className="text-h1 flex items-center justify-center font-bold">
            <ParenMedia>
              <ShowReel
                images={reelImages(project)}
                beat={0.5}
                alt={`${project.name} showreel`}
              />
            </ParenMedia>
          </RevealLine>
          <span className="text-note absolute right-28 top-1/2 max-md:hidden -translate-y-1/2 translate-x-full pl-[1vw] md:pl-[1.5vw]">
            Showreel
          </span>
        </div>

        <div className="flex w-full justify-center overflow-hidden">
          <RevealLine
            delay={0.0667}
            className="text-h1 text-center whitespace-nowrap"
          >
            <span style={{ fontSize: nameFontSize }}>{project.name}</span>
          </RevealLine>
        </div>
      </h1>

      {/* description */}
      <div className="page-margin page-grid">
        <div className="col-span-12 md:col-span-10 md:col-start-2">
          <RevealLine as="h2" className="text-h2 text-center">
            {project.description}
          </RevealLine>
        </div>
      </div>

      {/* gallery */}
      <div className="page-margin flex flex-col gap-y-[50px]">
        <RevealLine as="h2" className="text-h2 text-center">
          {galleryTitle(project)}
        </RevealLine>
        <HoverExpand images={galleryPanels} entry="load" />
      </div>

      {/* other Programs */}
      <div className="page-margin flex flex-col gap-y-[50px]">
        <RevealLine as="h2" className="text-h2 text-center">
          Other Programs you might be interested in
        </RevealLine>
        <div className="flex flex-col items-center gap-y-[30px]">
          {others.map((other) => (
            <Link
              key={other.slug}
              href={`/work/${other.slug}`}
              className="group relative block overflow-hidden"
            >
              <span className="text-h2 ease-custom-text-links block transition-all duration-700 group-hover:-translate-y-full">
                {other.name}
              </span>
              <span className="text-h2 ease-custom-text-links absolute top-0 left-0 block w-full translate-y-[105%] transition-all duration-700 group-hover:translate-y-0">
                {other.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
