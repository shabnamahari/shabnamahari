"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import MenuOverlay from "@/components/MenuOverlay";
import Footer from "@/components/Footer";
import BackControl from "@/components/BackControl";
import { backTarget } from "@/lib/back";

export default function SiteChrome({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Back belongs to the chrome, not to the pages. It had been placed by hand on
  // /auth alone, so every page nested under /work — the ones you can only reach
  // by going into something — had no way out but the browser's own button.
  const pathname = usePathname();
  const back = backTarget(pathname);

  return (
    <>
      <Header
        isMenuOpen={isMenuOpen}
        onToggleMenu={() => setIsMenuOpen((open) => !open)}
        hasBack={back !== null}
        /* Hidden while the overlay is up: the overlay is the way back from
           there, and two exits stacked in the same corner is one too many. */
        back={
          back && !isMenuOpen ? (
            <BackControl fallback={back} preferStored={pathname === "/auth"} />
          ) : null
        }
      />
      <MenuOverlay isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      {/* Below md the header is a fixed row with a background, so the page
          starts under it rather than behind it — by exactly its height,
          --site-header-h in globals.css, which is 0 from md. Inline rather than
          a class so the number lives in one place. */}
      <main style={{ paddingTop: "var(--site-header-h)" }}>{children}</main>
      <Footer />
    </>
  );
}
