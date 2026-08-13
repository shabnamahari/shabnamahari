import type { Metadata } from "next";
import {
  Kumbh_Sans,
  Instrument_Serif,
  Newsreader,
  Instrument_Sans,
  Inter,
  Vazirmatn,
} from "next/font/google";
import "./globals.css";

const kumbhSans = Kumbh_Sans({
  variable: "--font-kumbh",
  weight: "700",
  subsets: ["latin"],
});

// Neo-grotesque for the kinetic category tiles only — the Helvetica-ish face the
// motion reference uses, which the brand's Kumbh Sans doesn't cover.
// Loaded as a variable range rather than fixed cuts so design 3 can animate the
// weight down as the word shrinks, instead of snapping between two faces.
const grotesk = Inter({
  variable: "--font-grotesk",
  subsets: ["latin"],
  display: "swap",
});

// Brand guide, editorial layer (large): Instrument Serif — Google Fonts, free.
const psl = Instrument_Serif({
  variable: "--font-psl",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

// Brand guide, editorial layer (small): Newsreader — Google Fonts, free.
const psr = Newsreader({
  variable: "--font-psr",
  weight: "300",
  subsets: ["latin"],
  display: "swap",
});

// Brand guide, body/UI layer: Instrument Sans — Google Fonts, free.
const nhm = Instrument_Sans({
  variable: "--font-nhm",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

// Persian, everywhere Persian is read: the assistant and, later, the panel.
//
// One family, not two. The brand's Latin type has an editorial serif layer, and
// the temptation is to find a Persian serif to match it — but a good one that is
// free does not exist, and a bad one would be more conspicuous than no serif at
// all. So the Persian editorial voice is made from weight and size within
// Vazirmatn instead, which is why 300 is loaded alongside 400 and 700.
const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  weight: ["300", "400", "700"],
  subsets: ["arabic"],
  display: "swap",
});

export const metadata: Metadata = {
  // Shabnam's words. "Coaching" undersold it and left out the business English
  // side entirely, which is a third of what she teaches.
  title: "Shabnam Ahari — Ielts and business English studio",
  description: "Your goal speaks English.",
};

/**
 * Fonts, global CSS, and nothing else.
 *
 * The site's chrome — header, footer, smooth scroll, custom cursor, lightbox —
 * used to live here, which meant it applied to every route that would ever
 * exist. Two of the routes now being built cannot have it: a conversation needs
 * its own scroll container, and Lenis fights one; and `cursor: none` is wrong in
 * an admin panel. So the chrome moved down into `app/(site)/layout.tsx`, which
 * wraps exactly the marketing pages. Route groups don't appear in URLs, so
 * every existing address is unchanged.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${kumbhSans.variable} ${psl.variable} ${psr.variable} ${nhm.variable} ${grotesk.variable} ${vazirmatn.variable}`}
    >
      <body className="bg-cream text-ink font-nhm text-body antialiased">
        {children}
      </body>
    </html>
  );
}
