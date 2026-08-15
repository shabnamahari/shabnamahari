import type { NextConfig } from "next";

import { LEARN } from "./lib/routes";

const nextConfig: NextConfig = {
  /**
   * The addresses the Learn section used to have.
   *
   * `/services` and `/work/*` were the template's names, not Shabnam's. They
   * were live, they are in the knowledge base the assistant reads from, and the
   * assistant has already given one of them to a real person in a real
   * conversation. So they keep working — permanently, because a 308 is what
   * tells a browser and a search engine that the new address is the address,
   * rather than a detour that might be reversed next week.
   */
  async redirects() {
    return [
      { source: "/services", destination: LEARN, permanent: true },
      { source: "/work", destination: LEARN, permanent: true },
      { source: "/work/:path*", destination: `${LEARN}/:path*`, permanent: true },
      /*
       * The account page was at /account for as long as it took Shabnam to name
       * it. Nobody outside the two of us has ever had a session, so this is not
       * rescuing anyone's bookmark — it is here because sending someone who
       * signed in last week to a 404 on their own page is the one error on this
       * site that would look like their account had been deleted.
       *
       * Temporary rather than permanent, unlike the three above: a 308 is
       * cached by the browser forever and /account is a name that may yet be
       * wanted for something. The addresses above were retired for good.
       */
      { source: "/account", destination: "/myaccount", permanent: false },
    ];
  },
  /**
   * In development only: never let the browser cache a built asset.
   *
   * Turbopack does not content-hash the dev stylesheet — every rebuild is
   * served from the same `[root-of-the-server]__<hash>._.css` filename. A
   * browser that has the old one keeps using it, so a colour change lands in
   * the file, `curl` confirms it, and the page still shows the previous
   * version. That has now cost this project two separate rounds of chasing a
   * bug that was already fixed, once in the site's CSS and once in the
   * assistant's. Production is untouched: there the filenames are hashed and
   * long caching is the point.
   */
  async headers() {
    if (process.env.NODE_ENV !== "development") return [];
    return [
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "fastly.picsum.photos",
      },
    ],
  },
};

export default nextConfig;
