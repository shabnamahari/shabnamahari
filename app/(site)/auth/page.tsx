import type { Metadata } from "next";
import { AuthPanels } from "@/components/AuthSignUp";

export const metadata: Metadata = {
  title: "Set Up Your Account — Shabnam Ahari",
};

/**
 * Where "Set Up Your Account" lands.
 *
 * The same panels the home page's footer opens, standing open — there is no bar
 * to press here because pressing the link was the press. This page held "( in
 * production )" while sign-up did not exist; the link now arrives somewhere
 * that does something.
 *
 * Black rather than the site's cream, and that is not a choice made here so
 * much as one inherited: the panels are transparent glass with light type, so
 * they need a dark ground to be panels at all. The header and ( Back ) sit in
 * `mix-blend-difference`, so they invert against it without being told.
 */
export default function AuthPage() {
  return (
    <section
      data-surface="auth"
      className="bg-ink flex min-h-[100svh] w-full items-center justify-center px-[15px] py-[120px] text-white"
    >
      <div className="w-full">
        <AuthPanels />
      </div>
    </section>
  );
}
