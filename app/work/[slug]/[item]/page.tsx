import type { Metadata } from "next";
import RevealLine from "@/components/RevealLine";

export const metadata: Metadata = {
  title: "Keep Watching This Space — Adcker",
};

export default function GalleryItemPage() {
  return (
    <section className="flex min-h-[100svh] w-full items-center justify-center px-[15px]">
      <RevealLine as="h1" className="text-h2 text-center">
        Keep Watching This Space
      </RevealLine>
    </section>
  );
}
