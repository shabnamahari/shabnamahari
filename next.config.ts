import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
