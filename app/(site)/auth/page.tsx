import type { Metadata } from "next";
import { TextRevealH } from "@/components/TitleEffects";

export const metadata: Metadata = {
  title: "Set Up Your Account — Shabnam Ahari",
};

/**
 * Where "Set Up Your Account" lands until sign-up and sign-in are built. Held
 * empty on purpose: one line, the site's footer under it, and the same
 * entrance the gallery captions use, so arriving here reads as the same pause
 * the entry pages state rather than a broken link.
 */
export default function AuthPage() {
  return (
    <section className="flex min-h-[100svh] w-full items-center justify-center px-[15px]">
      {/* Note size, the same as the line on every entry page — the pause is
          the same pause, and setting it larger here made it a headline. */}
      <div data-active="true" className="text-note text-muted-ink text-center">
        <TextRevealH text="( in production )" />
      </div>
    </section>
  );
}
