import type { Metadata } from "next";
import { Kumbh_Sans } from "next/font/google";
import localFont from "next/font/local";
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

const psl = localFont({
  src: "../public/fonts/psl.woff2",
  variable: "--font-psl",
  weight: "300",
  display: "swap",
});

const psr = localFont({
  src: "../public/fonts/psr.woff2",
  variable: "--font-psr",
  weight: "400",
  display: "swap",
});

const nhm = localFont({
  src: "../public/fonts/nhm.woff2",
  variable: "--font-nhm",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Index — Adcker",
  description: "We're built for the art of hacking social.",
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
