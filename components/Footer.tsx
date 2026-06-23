"use client";

import RevealLine from "./RevealLine";

const MENU_LINKS = [
  { label: "Index", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Our Work", href: "/our-work" },
  { label: "About", href: "/about" },
];

const REACH_OUT_LINKS = [
  { label: "Email", href: "mailto:hello@adcker.com" },
  { label: "Instagram", href: "https://instagram.com" },
];

function scrollToTop() {
  if (typeof window !== "undefined" && window.__lenis) {
    window.__lenis.scrollTo(0, { duration: 1 });
  } else if (typeof window !== "undefined") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

export default function Footer() {
  return (
    <footer className="bg-ink px-[15px] text-white">
      <div className="page-grid gap-y-[30px] py-[100px] md:py-[200px]">
        <RevealLine
          as="h2"
          className="col-span-12 md:col-span-10 md:col-start-2 text-h2 text-center"
        >
          We don&rsquo;t just do social media, we master it. From
          scroll-stopping content to high-impact designs that drive real
          results, we make brands impossible to ignore. Let&rsquo;s create
          something unforgettable.
        </RevealLine>
        <div className="col-span-12 flex justify-center">
          <a
            href="mailto:hello@adcker.com"
            className="body-link"
            target="_blank"
            rel="noreferrer"
          >
            Don&rsquo;t be shy, contact us now →
          </a>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-y-[60px] pb-[100px] md:gap-x-[15px] md:pb-[200px]">
        <div className="col-span-12 grid grid-cols-5 md:col-span-6 md:grid-cols-4">
          <div className="col-span-2 whitespace-nowrap md:col-span-1">
            ( Menu )
          </div>
          <div className="col-span-3 flex flex-col items-start gap-y-2 pt-6">
            {MENU_LINKS.map((link) => (
              <a key={link.label} href={link.href} className="block">
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <div className="col-span-12 grid grid-cols-5 md:col-span-6 md:grid-cols-4">
          <div className="col-span-2 whitespace-nowrap md:col-span-1">
            ( Reach out )
          </div>
          <div className="col-span-3 flex flex-col items-start gap-y-2 pt-6">
            {REACH_OUT_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Back to top"
        className="text-h1-2 block w-full text-center font-kumbh font-bold lowercase leading-[0.78] tracking-tight"
      >
        adkr.
      </button>

      <div className="flex justify-between py-[15px] text-sm">
        <div>© 2025</div>
        <div className="flex gap-x-1">
          By ( <span className="body-link">Adcker Clone</span> )
        </div>
      </div>
    </footer>
  );
}
