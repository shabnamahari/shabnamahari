import type { Metadata } from "next";
import RevealLine from "@/components/RevealLine";

export const metadata: Metadata = {
  title: "Coming Soon — Shabnam Ahari",
};

export default function GalleryItemPage() {
  return (
    <section className="flex min-h-[100svh] w-full items-center justify-center px-[15px]">
      <RevealLine as="h1" className="text-h2 text-muted-ink w-full text-center">
        <span style={{ letterSpacing: "0.45em" }}>
          Keep Watching This Space
        </span>
      </RevealLine>
    </section>
  );
}
