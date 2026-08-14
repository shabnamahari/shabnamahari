"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { claimHandoff, releaseHandoff } from "@/app/(admin)/admin/queue/actions";

export type Waiting = {
  id: string;
  conversationId: string;
  reason: string | null;
  channel: string;
  lang: string;
  notified: boolean;
  claimed: boolean;
  createdAt: string;
  question: string | null;
};

/** How long they have been waiting, in the largest unit that is not a lie. */
function since(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours}h` : `${Math.round(hours / 24)}d`;
}

export default function QueueRow({
  waiting,
  canEdit,
}: {
  waiting: Waiting;
  canEdit: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function act(run: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const result = await run();
      if (!result.ok) setError(result.error ?? "That did not work.");
    });
  }

  const fa = waiting.lang === "fa";

  return (
    <li className="border-rule border-b py-4">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[0.9375rem]">{waiting.reason ?? "No reason given"}</p>
        <span className="text-muted-ink shrink-0 text-xs tabular-nums">
          {waiting.channel} · waiting {since(waiting.createdAt)}
        </span>
      </div>

      {waiting.question ? (
        <p
          dir={fa ? "rtl" : "ltr"}
          className={`text-muted-ink mt-1.5 text-sm ${fa ? "font-vazirmatn" : ""}`}
        >
          {waiting.question}
        </p>
      ) : null}

      {!waiting.notified ? (
        // Said plainly rather than assumed. The row exists either way, and a
        // queue that implies she was told when the message never left is worse
        // than one that admits it.
        <p className="text-red-ink mt-1.5 text-xs">
          The Telegram message did not go out — she has not actually been told.
        </p>
      ) : null}

      {error ? (
        <p className="text-red-ink mt-1.5 text-sm" role="status">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex items-center gap-4">
        <Link
          href={`/admin/conversations/${waiting.conversationId}`}
          className="text-muted-ink hover:text-ink text-sm underline underline-offset-4 transition-colors"
        >
          Read it
        </Link>

        {canEdit ? (
          waiting.claimed ? (
            <button
              type="button"
              onClick={() =>
                act(() =>
                  releaseHandoff({
                    id: waiting.id,
                    conversationId: waiting.conversationId,
                  }),
                )
              }
              disabled={pending}
              className="text-muted-ink hover:text-ink ml-auto text-sm underline underline-offset-4 disabled:opacity-35"
            >
              {pending ? "…" : "Give it back to the bot"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                act(() =>
                  claimHandoff({
                    id: waiting.id,
                    conversationId: waiting.conversationId,
                  }),
                )
              }
              disabled={pending}
              className="bg-ink ml-auto shrink-0 px-4 py-2 text-[0.9375rem] text-white transition-opacity disabled:opacity-35"
            >
              {pending ? "…" : "I am taking this"}
            </button>
          )
        ) : null}
      </div>

      {waiting.claimed ? (
        <p className="text-muted-ink mt-2 text-xs">
          {waiting.channel === "telegram"
            ? "Sir Cue is silent here. Their messages come to your Telegram — reply to one to answer, or /back to hand it over again."
            : // Nothing can be pushed into a browser, so taking a web
              // conversation is a note to yourself rather than a handover. Said
              // out loud, because the button reads as though it does more than
              // it can here — and Sir Cue keeps answering, deliberately, since
              // nobody else is going to.
              "This one is from the website, so there is nothing to reply through. Sir Cue keeps answering them; reach them on whatever they left on the People page."}
        </p>
      ) : null}
    </li>
  );
}
