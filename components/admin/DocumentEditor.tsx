"use client";

import { useState, useTransition } from "react";

import { deleteDocument, saveDocument } from "@/app/(admin)/admin/knowledge/actions";
import type { Lang } from "@/lib/chatbot/core/types";

/**
 * One document, closed until you open it.
 *
 * Closed, it is a title and a chunk count. Twenty-four textareas holding the
 * whole knowledge base is not a page anyone can read, and the thing being
 * looked for is almost always one of them.
 *
 * With no `id` it is the new-document form instead, which is the same component
 * because it is the same fields — a separate "add" screen would be the same
 * code with a different heading and a second place for the two to drift.
 */
export default function DocumentEditor({
  id,
  title: initialTitle = "",
  lang: initialLang = "en",
  text: initialText = "",
  chunks = 0,
  status,
  updatedAt,
  canEdit,
}: {
  id?: string;
  title?: string;
  lang?: Lang;
  text?: string;
  chunks?: number;
  status?: string;
  updatedAt?: string;
  canEdit: boolean;
}) {
  const isNew = !id;

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [lang, setLang] = useState<Lang>(initialLang);
  const [text, setText] = useState(initialText);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  const dirty =
    title !== initialTitle || lang !== initialLang || text !== initialText;

  function save() {
    setMessage(null);
    start(async () => {
      const result = await saveDocument({ id, title, lang, text });
      setFailed(!result.ok);
      if (result.ok) {
        setMessage(
          `Saved. ${result.chunks} chunk${result.chunks === 1 ? "" : "s"} re-embedded.`,
        );
        // The fields clear, the panel stays open. Closing it here as well hid
        // the confirmation the same instant it was set: the form emptied itself
        // and said nothing, which reads as the button having failed.
        if (isNew) {
          setTitle("");
          setText("");
        }
      } else {
        setMessage(result.error);
      }
    });
  }

  function remove() {
    if (!id) return;
    // A deleted document takes its embeddings with it and there is no undo, so
    // the confirmation names what is going.
    if (!confirm(`Delete "${initialTitle}"? Sir Cue will stop answering from it.`)) {
      return;
    }
    start(async () => {
      const result = await deleteDocument(id);
      setFailed(!result.ok);
      if (!result.ok) setMessage(result.error);
    });
  }

  const field =
    "border-rule focus:border-ink w-full border bg-white px-3 py-2 text-[0.9375rem] outline-none transition-colors";

  return (
    <div className="border-rule border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-baseline justify-between gap-4 px-4 py-3 text-left"
      >
        <span className="text-[0.9375rem]">
          {isNew ? (
            <span className="text-muted-ink">+ Write a new one</span>
          ) : (
            title || "Untitled"
          )}
        </span>
        {!isNew ? (
          <span className="text-muted-ink shrink-0 text-xs tabular-nums">
            {lang} · {chunks} chunk{chunks === 1 ? "" : "s"}
            {status && status !== "ready" ? ` · ${status}` : ""}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="border-rule flex flex-col gap-3 border-t p-4">
          <div className="flex gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              disabled={!canEdit || pending}
              className={field}
            />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              disabled={!canEdit || pending}
              className={`${field} w-28 shrink-0`}
            >
              <option value="en">English</option>
              <option value="fa">فارسی</option>
            </select>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            dir={lang === "fa" ? "rtl" : "ltr"}
            placeholder="What the bot may say about this."
            disabled={!canEdit || pending}
            className={`${field} resize-y leading-[1.7] ${
              lang === "fa" ? "font-vazirmatn" : ""
            }`}
          />

          {message ? (
            <p
              className={`text-sm ${failed ? "text-red-ink" : "text-confirm"}`}
              role="status"
            >
              {message}
            </p>
          ) : null}

          {canEdit ? (
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={save}
                disabled={pending || !dirty}
                className="bg-ink px-4 py-2 text-[0.9375rem] text-white transition-opacity disabled:opacity-35"
              >
                {pending ? "…" : isNew ? "Add" : "Save and re-embed"}
              </button>

              {!isNew ? (
                <button
                  type="button"
                  onClick={remove}
                  disabled={pending}
                  className="text-red-ink text-sm underline underline-offset-4 disabled:opacity-35"
                >
                  Delete
                </button>
              ) : null}

              {/* Saving is not free: the text is re-chunked and every chunk is
                  sent to the embedding provider. Worth saying before it is
                  pressed rather than explaining the wait afterwards. */}
              <span className="text-muted-ink ml-auto text-xs">
                {updatedAt
                  ? `Updated ${new Date(updatedAt).toLocaleDateString("en-GB")}`
                  : null}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
