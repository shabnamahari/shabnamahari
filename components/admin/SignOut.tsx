"use client";

import { useRouter } from "next/navigation";

export default function SignOut() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/admin/session", { method: "DELETE" });
        router.push("/admin/login");
        router.refresh();
      }}
      className="text-muted-ink hover:text-ink text-sm underline underline-offset-4 transition-colors"
    >
      Sign out
    </button>
  );
}
