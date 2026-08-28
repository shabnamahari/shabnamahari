import type { Metadata } from "next";
import {
  Kumbh_Sans,
  Instrument_Serif,
  Newsreader,
  Instrument_Sans,
  Inter,
  Vazirmatn,
} from "next/font/google";
import { reachableSiteUrl, siteUrl } from "@/lib/site-url";
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

// Shabnam's words. "Coaching" undersold it and left out the business English
// side entirely, which is a third of what she teaches.
const TITLE = "Shabnam Ahari — IELTS and Business English studio";
const DESCRIPTION = "Your goal speaks English.";

/**
 * The picture that goes with the link, and why there is one at all.
 *
 * Shabnam bookmarked her own site twice and got two different pictures: her
 * portrait one day, a misty forest the next. Nothing had changed — the second
 * was the home page, whose photographs are still the placeholders fetched from
 * picsum.photos, and with no image declared anywhere the browser had fallen
 * back to snapshotting whatever happened to be on screen. Every share of this
 * link — Telegram, LinkedIn, a bookmark — was a lottery over stock photography
 * that is not hers.
 *
 * So `public/og.jpg` is declared instead: her own portrait from the About page
 * beside the tagline, set in the site's own Kumbh on the site's own cream.
 * 1200×630, which is what every platform crops from.
 *
 * `metadataBase` is what turns "/og.jpg" into an absolute URL, and every
 * scraper needs it absolute. `reachableSiteUrl` first, because that is the one
 * helper that refuses to hand back a loopback address — `NEXT_PUBLIC_SITE_URL`
 * is correctly `localhost:3000` on a laptop, and a production build that
 * inherited it would advertise an image nobody outside this machine can fetch.
 */
const base = reachableSiteUrl() || siteUrl() || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Shabnam Ahari",
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Shabnam Ahari — your goal speaks English",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.jpg"],
  },
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
