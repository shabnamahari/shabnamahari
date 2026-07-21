"use client";

import { useEffect } from "react";
import { scrollContactIntoView } from "@/lib/scrollToContact";

/**
 * Handles arriving at "/#contact" from another page. The scroll has to happen
 * once the homepage itself is mounted — the router updates the URL before the
 * new page renders, so a caller on the previous page cannot measure this layout.
 */
export default function ContactHashScroll() {
  useEffect(() => {
    if (window.location.hash !== "#contact") return;

    // Drop the hash so a later reload does not jump again.
    history.replaceState(null, "", window.location.pathname);
    scrollContactIntoView();
  }, []);

  return null;
}
