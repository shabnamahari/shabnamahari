"use client";

import { useRouter } from "next/navigation";

/**
 * Sits directly under the header's Menu, in the same type and the same
 * blend mode, so the two read as one stack rather than a button that wandered
 * in. Offset by the header's own 15px padding plus the line it sets.
 *
 * It goes back through history rather than to a fixed page: /auth is reached
 * from any of the eighteen entries, and the entry you came from is the one
 * place "back" can honestly mean.
 */
export default function BackControl({ label = "Back" }: { label?: string }) {
  const router = useRouter();

  return (
    <div className="fixed top-[38px] right-0 z-[999999999] flex w-full items-center justify-end px-[15px] text-white mix-blend-difference">
      <button
        type="button"
        onClick={() => router.back()}
        className="text-sm font-semibold tracking-wide uppercase"
      >
        {label}
      </button>
    </div>
  );
}
