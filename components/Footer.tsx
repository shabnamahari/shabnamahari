"use client";

import RevealLine from "./RevealLine";
import FooterWordmark from "./FooterWordmark";

const MENU_LINKS = [
  { label: "Index", href: "/" },
  { label: "Learn", href: "/services" },
  { label: "About", href: "/about" },
];

const REACH_OUT_LINKS = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/shabnam-ahari-372573101",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/shabnameahari?igsh=MTlycGVmdmN0dG1hNg%3D%3D&utm_source=qr",
  },
];

export default function Footer() {
  return (
    <footer className="bg-ink px-[15px] text-white">
      <div className="page-grid gap-y-[30px] py-[100px] md:py-[200px]">
        <RevealLine
          as="h2"
          className="col-span-12 md:col-span-10 md:col-start-2 text-h2 text-center"
        >
          First attempt or third, the starting point is the same: finding out
          exactly where you stand today. I build a personalized learning path
          around your exact goal — whether that&rsquo;s a Band 7, a
          promotion, or a life abroad. And I stay committed until you get
          there.
        </RevealLine>
        <div className="col-span-12 flex justify-center">
          <a
            href="mailto:hello@adcker.com"
            className="body-link"
            target="_blank"
            rel="noreferrer"
          >
            If you have a target score and a date, start here →
          </a>
        </div>
      </div>

      {/* Contact from the menu lands here: the nav row sits at the top of the
          viewport with the wordmark filling the rest, matching the original. */}
      <div
        id="contact"
        className="grid grid-cols-12 gap-y-[60px] pb-[100px] md:gap-x-[15px] md:pb-[200px]"
      >
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

      <FooterWordmark />
    </footer>
  );
}
