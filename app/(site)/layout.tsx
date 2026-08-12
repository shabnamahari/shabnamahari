import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import CustomCursor from "@/components/CustomCursor";
import LightboxProvider from "@/components/Lightbox";
import SiteChrome from "@/components/SiteChrome";
import AssistantMount from "@/components/chat/mount";

/**
 * The marketing site's chrome: header, footer, smooth scroll, custom cursor,
 * lightbox.
 *
 * This all used to sit in the root layout, where it applied to every route in
 * the app. That was fine while every route was a marketing page. It stops being
 * fine with the two routes now being built: Lenis takes over the window's
 * scroll, which fights a conversation's own scrolling container, and
 * `cursor: none` is the wrong call in an admin panel where precision matters.
 *
 * Route groups don't appear in URLs, so `/`, `/about`, `/services` and
 * `/work/...` are all exactly where they were.
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
      {/* Outside the chrome and outside Lenis. Inside SmoothScrollProvider the
          conversation's own scrolling container fights the page's, and the
          panel has to sit above the header rather than inside it. */}
      <AssistantMount />
    </>
  );
}
