"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import MenuOverlay from "@/components/MenuOverlay";
import Footer from "@/components/Footer";
import BackControl from "@/components/BackControl";
import Preloader from "@/components/Preloader";
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
      {/* Mounted here rather than per page, so it runs on the document load and
          never again on a navigation between routes. */}
      <Preloader />
      <Header
        isMenuOpen={isMenuOpen}
        onToggleMenu={() => setIsMenuOpen((open) => !open)}
        hasBack={back !== null}
      />
      {/* Hidden while the overlay is up: the overlay is the way back from
          there, and two exits stacked in the same corner is one too many. */}
      {back && !isMenuOpen ? (
        <BackControl fallback={back} preferStored={pathname === "/auth"} />
      ) : null}
      <MenuOverlay isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <main>{children}</main>
      <Footer />
    </>
  );
}
