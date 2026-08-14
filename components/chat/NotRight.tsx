"use client";

import { useState } from "react";

import type { Lang } from "@/lib/chatbot/core/types";

/**
 * The one thing a reader can say back about an answer.
 *
 * Down only. A thumbs-up is a number nobody acts on, and two marks under every
 * answer turns a conversation into a form — Shabnam's objection, and the right
 * one. This is one small line that says nothing until it is needed.
 *
 * White at 60%, and no colour at all. `#FF3B30` is the brand's one saturated
 * colour and the guide keeps it out of anything that has to be read; a red
 * mark under every answer would also make the assistant look like it expects
 * to be wrong. It is not the panel's grey either — Shabnam asked for white, and
 * quiet is carried by the size and the opacity rather than by draining the
 * colour, which at #8a8a8a read as disabled rather than secondary.
 *
 * Per answer rather than per conversation, because a conversation in a chat
 * panel has no end — the reader closes the tab — and because a report that
 * cannot name which answer failed cannot be paired with the passages that
 * produced it, which is the whole diagnostic value.
 */

const COPY = {
  en: {
    report: "That wasn't right",
    ask: "What was wrong?",
    send: "Send",
    skip: "Never mind",
    done: "Noted. Thank you.",
  },
  fa: {
    report: "این درست نبود",
    ask: "چه چیزش غلط بود؟",
    send: "بفرست",
    skip: "بی‌خیال",
    // «ثبت شد» rather than «متشکریم»: it says the thing happened, which is
    // what someone reporting a fault wants to hear.
    done: "ثبت شد. ممنون.",
  },
} as const;

type Stage = "idle" | "asking" | "done";

export default function NotRight({
  messageId,
  lang,
}: {
  messageId: string;
  lang: Lang;
}) {
  const [stage, setStage] = useState<Stage>("idle");
  const [comment, setComment] = useState("");
  const t = COPY[lang];

  /** Fire and forget. A failed report must not become the reader's problem. */
  function send(withComment: string | null) {
    void fetch("/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messageId, comment: withComment }),
    }).catch(() => {});
  }

  if (stage === "done") {
    return <p className="mt-1.5 text-[0.75rem] text-white/60">{t.done}</p>;
  }

  if (stage === "asking") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(comment);
          setStage("done");
        }}
        className="mt-2 flex items-center gap-2"
      >
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t.ask}
          autoFocus
          maxLength={500}
          className="border-chat-edge placeholder:text-chat-dim min-w-0 flex-1 border-b bg-transparent pb-1 text-[0.8125rem] text-white outline-none"
        />
        <button
          type="submit"
          className="shrink-0 text-[0.75rem] text-white/60 transition-colors hover:text-white"
        >
          {t.send}
        </button>
        <button
          type="button"
          // The report is already recorded. This dismisses the question, not
          // the report — leaving without explaining still counts.
          onClick={() => setStage("done")}
          className="shrink-0 text-[0.75rem] text-white/60 transition-colors hover:text-white"
        >
          {t.skip}
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        // Recorded on the first press, before the reason is asked for. Most
        // people will not write one, and the fact that this answer was wrong is
        // the part worth having.
        send(null);
        setStage("asking");
      }}
      className="mt-1.5 text-[0.75rem] text-white/60 transition-colors hover:text-white"
    >
      {t.report}
    </button>
  );
}
