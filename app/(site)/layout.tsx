import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import CustomCursor from "@/components/CustomCursor";
import CursorTrail from "@/components/CursorTrail";
import LightboxProvider from "@/components/Lightbox";
import SiteChrome from "@/components/SiteChrome";
import AssistantMount from "@/components/chat/mount";

/**
 * Rebuild these pages in the background every quarter of an hour.
 *
 * The assistant's greeting is read from `channel_copy` while a page is being
 * prerendered, so without this it is whatever the database said at the moment
 * of the last deploy — frozen there until someone deploys again. Two things
 * follow from that, and both bit within an hour of going live: an edit to the
 * greeting changed nothing on the site, and one build could not reach Supabase,
 * quietly baked the hardcoded fallback into every page, and left it there.
 *
 * Fifteen minutes is the window in which either of those now corrects itself.
 * It costs one small query per page per quarter hour. When the admin panel can
 * edit this copy it should call `revalidatePath` on save and not wait.
 */
export const revalidate = 900;

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
 * Route groups don't appear in URLs, so `/`, `/about`, `/learn` and
 * `/learn/...` are all exactly where they were.
 */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {/* The line the pointer leaves, under the pointer itself. */}
      <CursorTrail />
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
