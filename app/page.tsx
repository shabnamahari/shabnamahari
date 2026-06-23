"use client";

import { useState } from "react";
import Header from "@/components/Header";
import MenuOverlay from "@/components/MenuOverlay";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Quote from "@/components/Quote";
import Footer from "@/components/Footer";

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <Header
        isMenuOpen={isMenuOpen}
        onToggleMenu={() => setIsMenuOpen((open) => !open)}
      />
      <MenuOverlay isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <main>
        <Hero />
        <Services />
        <Quote />
      </main>
      <Footer />
    </>
  );
}
