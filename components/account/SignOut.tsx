"use client";

import { useState } from "react";

/**
 * Signing out, as a POST.
 *
 * A link would do it in one fewer file, and would also let any other site sign
 * this person out by embedding it as an image. Being signed out is not the
 * worst thing that can be done to someone, but it is not a stranger's to do.
 */
export default function SignOut() {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch("/api/auth/signout", { method: "POST" });
        } finally {
          // A full navigation, not a router push: the session is gone from the
          // cookie jar and every server component that has rendered on this
          // page still believes otherwise.
          window.location.assign("/");
        }
      }}
      className="body-link disabled:opacity-50"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
