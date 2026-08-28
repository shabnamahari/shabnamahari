"use client";

import { useState, useTransition } from "react";

import { restorePrompt, savePrompt } from "@/app/(admin)/admin/prompt/actions";
import type { Lang } from "@/lib/chatbot/core/types";

type HistoryEntry = {
  id: string;
  version: number;
  note: string | null;
  isActive: boolean;
  createdAt: string;
};

export default function PromptEditor({
  lang,
  heading,
  active,
  history,
  canEdit,
}: {
  lang: Lang;
  heading: string;
  active: { version: number; content: string; note: string | null };
  history: HistoryEntry[];
  canEdit: boolean;
}) {
  const [content, setContent] = useState(active.content);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pending, start] = useTransition();

  const dirty = content !== active.content;

  function save() {
    setMessage(null);
    start(async () => {
      const result = await savePrompt({ lang, content, note });
      setFailed(!result.ok);
      setMessage(
        result.ok ? `Live as v${result.version}.` : result.error,
      );
      if (result.ok) setNote("");
    });
  }

  function restore(entry: HistoryEntry) {
    if (!confirm(`Make v${entry.version} live again?`)) return;
    setMessage(null);
    start(async () => {
      const result = await restorePrompt({ lang, id: entry.id, version: entry.version });
      setFailed(!result.ok);
      setMessage(result.ok ? `v${result.version} is live.` : result.error);
    });
  }

  const field =
    "border-rule focus:border-ink w-full border bg-white px-3 py-2 text-[0.9375rem] outline-none transition-colors";

  return (
    <section className="mt-12">
      <div className="flex items-baseline justify-between">
        <h2 className="font-instrument-sans text-lg font-bold">{heading}</h2>
        <span className="text-muted-ink text-xs tabular-nums">
          live: v{active.version}
          {active.note ? ` · ${active.note}` : ""}
        </span>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={20}
        dir={lang === "fa" ? "rtl" : "ltr"}
        disabled={!canEdit || pending}
        className={`${field} mt-3 resize-y leading-[1.7] ${
          lang === "fa" ? "font-vazirmatn" : "font-mono text-[0.8125rem]"
        }`}
      />

      {message ? (
        <p
          className={`mt-3 text-sm ${failed ? "text-red-ink" : "text-confirm"}`}
          role="status"
        >
          {message}
        </p>
      ) : null}

      {canEdit ? (
        <div className="mt-3 flex items-center gap-3">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What changed?"
            disabled={pending}
            className={`${field} flex-1`}
          />
          <button
            type="button"
            onClick={save}
            disabled={pending || !dirty}
            className="bg-ink shrink-0 px-4 py-2 text-[0.9375rem] text-white transition-opacity disabled:opacity-35"
          >
            {pending ? "…" : "Save as new version"}
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setShowHistory((v) => !v)}
        className="text-muted-ink hover:text-ink mt-4 text-sm underline underline-offset-4 transition-colors"
      >
        {showHistory ? "Hide" : `${history.length} versions`}
      </button>

      {showHistory ? (
        <ul className="border-rule mt-3 border-t">
          {history.map((entry) => (
            <li
              key={entry.id}
              className="border-rule flex items-baseline justify-between gap-4 border-b py-2.5"
            >
              <span className="text-sm">
                <span className="tabular-nums">v{entry.version}</span>
                {entry.note ? (
                  <span className="text-muted-ink"> · {entry.note}</span>
                ) : null}
              </span>
              {entry.isActive ? (
                <span className="text-confirm shrink-0 text-xs tracking-wide uppercase">
                  live
                </span>
              ) : canEdit ? (
                <button
                  type="button"
                  onClick={() => restore(entry)}
                  disabled={pending}
                  className="text-muted-ink hover:text-ink shrink-0 text-xs underline underline-offset-4 disabled:opacity-35"
                >
                  Make live
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
