import type { Metadata } from "next";

import { requireAccount } from "@/lib/account/current";
import SignOut from "@/components/account/SignOut";

export const metadata: Metadata = {
  title: "Your page — Shabnam Ahari",
};

/**
 * Where signing in lands.
 *
 * Deliberately the smallest true thing rather than a mock of the page Shabnam
 * described. She wants a personal page for the learner — their path, their
 * sessions, their placement result — and none of those exist yet. Building
 * panels for them now would mean inventing what they say, and a page of
 * plausible-looking figures that mean nothing is worse than a short page that
 * means what it says.
 *
 * So this states what is actually known: who is signed in, and the address that
 * proves it. It is the anchor for the real page, which is designed next.
 *
 * `dynamic` because it must never be prerendered or cached — it is different
 * for every reader and would otherwise be built once, at deploy, for nobody.
 */
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const account = await requireAccount();

  return (
    <section className="flex min-h-[100svh] w-full items-center justify-center px-[15px] py-[120px]">
      <div className="mx-auto w-[clamp(20rem,34vw,40rem)]">
        <h1 className="text-h2">
          {account.name ? `Hello, ${account.name}.` : "Hello."}
        </h1>

        <p className="text-note text-muted-ink mt-6">
          You are signed in as {account.email}.
        </p>

        {/* Said plainly rather than dressed up as an empty state. Someone who
            has just made an account is owed the truth about what is behind it,
            and "your learning path will appear here" would be a promise made by
            a page rather than by Shabnam. */}
        <p className="text-note text-muted-ink mt-6">
          This is where your learning path will live. It is being built — there
          is nothing here yet.
        </p>

        <div className="mt-12">
          <SignOut />
        </div>
      </div>
    </section>
  );
}
