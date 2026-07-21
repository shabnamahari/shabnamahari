/**
 * Lands on the footer's contact block with its nav row at the top of the
 * viewport, so the nav and the big wordmark are framed together. Scrolling to
 * the very bottom of the document instead would push the nav row off-screen.
 */
function scrollNow(): boolean {
  const target = document.getElementById("contact");
  if (!target) return false;

  // After a client-side navigation Lenis is still holding the previous page's
  // dimensions, and would clamp this scroll to that page's shorter maximum.
  window.__lenis?.resize();

  const max = document.body.scrollHeight - window.innerHeight;
  if (max <= 0) return false;

  const top = Math.min(
    target.getBoundingClientRect().top + window.scrollY,
    max,
  );

  if (window.__lenis) {
    window.__lenis.scrollTo(top, { duration: 1.4 });
  } else {
    window.scrollTo({ top, behavior: "smooth" });
  }
  return true;
}

/**
 * Scrolls to the contact block once the page has settled. Fonts and media keep
 * resizing the document for a few frames after mount, and measuring during that
 * window lands short — so wait for the height to hold steady first.
 */
export function scrollContactIntoView() {
  const deadline = Date.now() + 5000;
  let lastHeight = -1;
  let stableFrames = 0;

  const attempt = () => {
    if (Date.now() > deadline) return;

    const height = document.body.scrollHeight;
    stableFrames = height === lastHeight ? stableFrames + 1 : 0;
    lastHeight = height;

    if (stableFrames >= 3 && scrollNow()) return;
    requestAnimationFrame(attempt);
  };

  requestAnimationFrame(attempt);
}
