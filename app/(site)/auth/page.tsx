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
/**
 * `?bg=dark` paints this page the footer's black.
 *
 * Not a design change — a way of looking at one. Shabnam's question is how
 * transparent the glass actually is, and on a page this flat there is nothing
 * behind it to show through, so it reads as solid however transparent it is.
 * Measured, the same panel comes out rgb(89, 102, 94) over the cream and
 * rgb(20, 34, 27) over black; the switch exists so that difference can be seen
 * rather than taken on trust.
 *
 * A query parameter rather than the page's own colour, the way `?panel=` and
 * the assistant's `?bar=` are, because she has already said this page should
 * keep its own. If she changes her mind the default moves; until then nothing
 * about the page anyone actually arrives at has changed.
 */
export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const dark = (await searchParams).bg === "dark";

  return (
    <section
      data-surface="auth"
      className={`flex min-h-[100svh] w-full items-center justify-center px-[15px] py-[120px] ${
        dark ? "bg-ink" : ""
      }`}
    >
      <div className="w-full">
        <AuthPanels />
      </div>
    </section>
  );
}
