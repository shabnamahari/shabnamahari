import type { Metadata } from "next";
import { AuthPanels } from "@/components/AuthSignUp";

export const metadata: Metadata = {
  title: "Set Up Your Account — Shabnam Ahari",
};

/**
 * Where "Set Up Your Account" lands.
 *
 * The same panels the home page's footer opens, standing open — there is no bar
 * to press here because pressing the link was the press, and nothing to reveal
 * because nothing was hidden.
 *
 * On the site's own cream. It was briefly black, on the reasoning that the
 * panels are glass with light type and glass needs a dark ground; Shabnam's
 * answer was that the page is not the footer and should not borrow its colour.
 *
 * The panels carried a separate `light` tone for that, and the two sets drifted:
 * a change made to one was not made to the other, so two pages meant to be the
 * same form were quietly becoming two. There is one set now, and this page takes
 * it unmodified — which is the point.
 */
export default function AuthPage() {
  return (
    <section
      data-surface="auth"
      className="flex min-h-[100svh] w-full items-center justify-center px-[15px] py-[120px]"
    >
      <div className="w-full">
        <AuthPanels />
      </div>
    </section>
  );
}
