"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "That did not work.");
        return;
      }

      // `refresh` as well as `push`: the destination is a server component that
      // reads the cookie, and without this the client router can serve it from
      // a cache taken while signed out.
      router.push(next);
      router.refresh();
    } catch {
      setError("That did not go through. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "border-rule focus:border-ink mt-1 w-full border bg-white px-3 py-2 text-[0.9375rem] outline-none transition-colors";

  return (
    <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
      <label className="block">
        <span className="text-muted-ink text-xs tracking-wide uppercase">Email</span>
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={field}
        />
      </label>

      <label className="block">
        <span className="text-muted-ink text-xs tracking-wide uppercase">
          Password
        </span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={field}
        />
      </label>

      {error ? (
        <p className="text-red-ink text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="bg-ink mt-2 px-4 py-2.5 text-[0.9375rem] text-white transition-opacity disabled:opacity-40"
      >
        {busy ? "…" : "Sign in"}
      </button>
    </form>
  );
}
