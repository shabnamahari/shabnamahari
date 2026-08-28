import type { Metadata } from "next";

import LoginForm from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Sign in — Panel",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-gutter">
      <div className="w-full max-w-sm">
        <h1 className="font-instrument-sans text-2xl font-bold tracking-tight">Panel</h1>
        <p className="text-muted-ink mt-2 text-sm">
          The knowledge base, the model, and what Sir Cue is told to be.
        </p>
        {/*
          Only a path is passed through, and only one beginning /admin — an open
          redirect is the classic way a login form becomes someone else's tool.
        */}
        <LoginForm next={next?.startsWith("/admin") ? next : "/admin"} />
      </div>
    </main>
  );
}
