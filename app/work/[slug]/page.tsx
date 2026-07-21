import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import RevealLine from "@/components/RevealLine";
import Asterisk from "@/components/Asterisk";
import ParenMedia from "@/components/ParenMedia";
import VideoSlot from "@/components/VideoSlot";
import { PROJECTS, getProject, galleryItems } from "@/lib/projects";

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
  return { title: project ? `${project.name} — Adcker` : "Adcker" };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const gallery = galleryItems(project.slug);
  const others = PROJECTS.filter((p) => p.slug !== project.slug);

  return (
    <div className="flex flex-col gap-y-[100px] pb-[100px] md:gap-y-[200px] md:pb-[200px]">
      {/* hero: ✳ ( video ) + name */}
      <h1 className="flex min-h-[100svh] w-full flex-col items-center justify-center gap-y-2 overflow-hidden py-[15px]">
        <div className="relative flex shrink-0 items-center px-28">
          <span className="absolute left-24 w-[calc((0.9em+2.7vw)*1.5)] -translate-x-full pt-1 text-ink">
            <Asterisk />
          </span>
          <RevealLine className="text-h1 flex items-center justify-center font-bold">
            <ParenMedia>
              <VideoSlot label="Showreel" />
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
            {project.name}
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
          Gallery
        </RevealLine>
        <div className="grid grid-cols-1 gap-x-[15px] gap-y-[60px] sm:grid-cols-2 lg:grid-cols-3">
          {gallery.map((item) => (
            <Link
              key={item.num}
              href={item.href}
              className="group flex flex-col gap-y-[15px]"
            >
              <span className="text-note">( {item.num} )</span>
              <div className="relative aspect-[3/5] w-full overflow-hidden bg-media-gray grayscale transition-all duration-500 group-hover:grayscale-0">
                <Image
                  src={item.image}
                  alt={`${project.name} ${item.num}`}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  unoptimized
                  className="object-cover"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* other projects */}
      <div className="page-margin flex flex-col gap-y-[50px]">
        <RevealLine as="h2" className="text-h2 text-center">
          Other projects you might be interested in
        </RevealLine>
        <div className="flex flex-col items-center gap-y-[30px]">
          {others.map((other) => (
            <Link
              key={other.slug}
              href={`/work/${other.slug}`}
              className="group relative block overflow-hidden"
            >
              <span className="text-h2 ease-custom-text-links block transition-all duration-700 lg:group-hover:-translate-y-full">
                {other.name}
              </span>
              <span className="text-h2 ease-custom-text-links absolute top-0 left-0 block w-full translate-y-[105%] transition-all duration-700 lg:group-hover:translate-y-0">
                {other.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
