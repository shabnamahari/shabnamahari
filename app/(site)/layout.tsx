import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import CustomCursor from "@/components/CustomCursor";
import LightboxProvider from "@/components/Lightbox";
import SiteChrome from "@/components/SiteChrome";

/**
 * The marketing site: header, footer, smooth scroll, custom cursor, lightbox.
 *
 * Lifted out of the root layout so `/assistant` and `/admin` can opt out of all
 * four. Nothing about the pages inside changed, and route groups are invisible
 * to the router, so `/`, `/about`, `/services` and `/work/…` still resolve to
 * exactly the same URLs.
 */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <CustomCursor />
      <SmoothScrollProvider>
        <LightboxProvider>
          <SiteChrome>{children}</SiteChrome>
        </LightboxProvider>
      </SmoothScrollProvider>
    </>
  );
}
