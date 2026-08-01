import type { Metadata } from "next";
import {
  Kumbh_Sans,
  Instrument_Serif,
  Newsreader,
  Instrument_Sans,
} from "next/font/google";
import "./globals.css";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import CustomCursor from "@/components/CustomCursor";
import LightboxProvider from "@/components/Lightbox";
import SiteChrome from "@/components/SiteChrome";

const kumbhSans = Kumbh_Sans({
  variable: "--font-kumbh",
  weight: "700",
  subsets: ["latin"],
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

export const metadata: Metadata = {
  title: "Shabnam Ahari — IELTS & English Coaching",
  description: "Your goal speaks English.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${kumbhSans.variable} ${psl.variable} ${psr.variable} ${nhm.variable}`}
    >
      <body className="bg-cream text-ink font-nhm text-body antialiased">
        <CustomCursor />
        <SmoothScrollProvider>
          <LightboxProvider>
            <SiteChrome>{children}</SiteChrome>
          </LightboxProvider>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
