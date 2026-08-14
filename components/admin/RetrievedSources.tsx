"use client";

import { useState } from "react";

export type Source = {
  id: string;
  title: string;
  lang: string;
  chunkIndex: number;
  content: string;
};

/**
 * What the model was actually looking at when it wrote the answer above.
 *
 * This is the difference between two failures that look identical from the
 * transcript. An answer can be wrong because the model was handed the right
 * passage and wrote badly, or because it was handed the wrong passage and had
 * nothing better to say. The first is a prompt or a model problem; the second
 * is a retrieval or a content problem, and they are fixed in different places.
 * Reading the answer alone cannot tell them apart.
 *
 * Closed by default. A transcript is for reading a conversation; the passages
 * are for the moment you stop believing one of the answers.
 */
export default function RetrievedSources({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);

  if (sources.length === 0) {
    return (
      <p className="text-muted-ink mt-1.5 text-xs">
        {/* Not the same as "no sources were good enough". The bot is told to
            say it does not know rather than answer from the model's own
            knowledge, so an answer written from nothing is worth seeing. */}
        answered from nothing retrieved
      </p>
    );
  }

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-muted-ink hover:text-ink text-xs underline underline-offset-4 transition-colors"
      >
        {open ? "Hide" : "Read"} the {sources.length} passage
        {sources.length === 1 ? "" : "s"} behind this
      </button>

      {open ? (
        <ul className="mt-3 flex flex-col gap-3">
          {sources.map((source) => {
            const fa = source.lang === "fa";
            return (
              <li key={source.id} className="border-rule border-s-2 ps-3">
                <div className="text-muted-ink text-xs tabular-nums">
                  {source.title} · part {source.chunkIndex + 1}
                </div>
                <p
                  dir={fa ? "rtl" : "ltr"}
                  className={`mt-1 text-sm leading-[1.7] whitespace-pre-wrap ${
                    fa ? "font-vazirmatn" : ""
                  }`}
                >
                  {source.content}
                </p>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
