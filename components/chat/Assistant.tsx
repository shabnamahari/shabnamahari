"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Lang } from "@/lib/chatbot/core/types";

/**
 * The assistant, floating over the site.
 *
 * Closed, it is one bar at the top of the page that says `ask me`. Open, three
 * more panels drop below it: the conversation, the composer, and the language
 * switch. The site keeps showing through all four — the panels are black glass
 * on the cream ground, which is why they carry their own light-on-dark palette
 * rather than the site's ink-on-cream.
 *
 * Everything here is presentation. Which language to answer in, what to
 * retrieve, when to call a tool — all of that is `converse()`, so the widget and
 * Telegram inherit it instead of reimplementing it.
 */

export type Copy = { welcome: string };

type Message = {
  id: string;
  role: "user" | "bot";
  text: string;
  /** Per message, not per page: a Persian answer can follow an English question. */
  lang: Lang;
};

/**
 * The five ways in.
 *
 * The label is a topic and the question is a sentence, because they are read by
 * different readers: the person scans five short phrases, and the brain needs
 * something it can actually retrieve against. "Payment & fees" matches nothing
 * in the knowledge base; "How does payment work?" matches the fees section.
 */
const TOPICS: { en: [string, string]; fa: [string, string] }[] = [
  {
    en: ["Registration", "How do I join?"],
    fa: ["ثبت‌نام", "چطور ثبت‌نام کنم؟"],
  },
  {
    en: ["Course details", "What does each course cover?"],
    fa: ["جزئیات دوره", "هر دوره شامل چه چیزی است؟"],
  },
  {
    en: ["Payment & fees", "How does payment work?"],
    fa: ["پرداخت و هزینه", "پرداخت چطور است؟"],
  },
];

const UI = {
  en: {
    title: "What are you looking for?",
    placeholder: "Ask about the courses and registration",
    send: "Send",
    close: "Close",
    failed: "That did not go through. Try again.",
    /** The label names the language you are switching to, not the one you are in. */
    switchLabel: "Persian",
  },
  fa: {
    // Not a translation of the English. «دنبال چه چیزی می‌گردید؟» is a shop
    // assistant; this is the two of you starting something.
    title: "از کجا شروع کنیم؟",
    // «شما», because nothing has been answered yet. The pronoun moves to «تو»
    // from the second answer on, and that is the brain's job — but the empty
    // field is the first thing anyone reads, and it would be addressing someone
    // informally before a word has been exchanged.
    placeholder: "درباره‌ی دوره‌ها و ثبت‌نام بپرسید",
    // A noun, not an imperative, so the button never has to pick a pronoun.
    send: "ارسال",
    close: "بستن",
    failed: "نرسید. یک بار دیگر بفرستید.",
    switchLabel: "English",
  },
} as const;

/** The four panels share one shape, so they read as one object. */
/**
 * The blur is 5px, not 24px, and that is what makes the glass look like glass.
 *
 * At `backdrop-blur-xl` the headline behind was smeared so far that the panel
 * read as a flat grey slab — thinning the black underneath it changed the
 * number and changed nothing anyone could see. Transparency is legible only
 * when you can still make out what is behind: enough blur to keep the text in
 * front readable, not so much that the page becomes fog.
 */
const PANEL = "rounded-[28px] border border-chat-edge bg-chat-panel backdrop-blur-[5px]";

/**
 * One width for all four, and the single reason they can never drift apart.
 *
 * 34% of the window, centred: a shade narrower than the word YOUR in the
 * homepage headline, which is the measure Shabnam gave. Every panel takes this
 * and none sets its own, so a change here moves the whole stack together.
 *
 * A proportion rather than a fixed maximum, because a maximum only looks right
 * on the window it was chosen for. Capped at 34vw it was 38% of a 1440px screen
 * and 47% of an 1160px one — the same CSS reading as two different designs. The
 * bounds stop it collapsing on a phone and sprawling on a wide display.
 */
const WIDTH = "mx-auto w-[clamp(20rem,34vw,40rem)]";

/**
 * One height for the three small panels — header, composer, language.
 *
 * Same reasoning as WIDTH: they were 54, 60 and 48 apart, close enough to look
 * like a mistake rather than a rhythm. Held in one place they cannot drift.
 *
 * `?bar=48` overrides it, so two windows can be put side by side and compared
 * rather than remembered. Once a number is chosen this goes back to a constant.
 */
const BAR_DEFAULT = 42;

function fontFor(lang: Lang): string {
  return lang === "fa" ? "font-vazirmatn" : "font-nhm";
}

export default function Assistant({ copy }: { copy: Record<Lang, Copy> }) {
  const [open, setOpen] = useState(false);
  /** `?chat=off` takes the assistant off the page, for looking at the site alone. */
  const [hidden, setHidden] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [barPx, setBarPx] = useState(BAR_DEFAULT);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const t = UI[lang];

  // `/assistant` is a real address that has to keep working, so it redirects
  // here and says so in the query rather than rendering a second copy of the
  // page underneath a second copy of the panel.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("chat") === "off") setHidden(true);
    if (params.has("ask")) setOpen(true);
    const bar = Number(params.get("bar"));
    if (Number.isFinite(bar) && bar >= 32 && bar <= 96) setBarPx(bar);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  /*
   * Nothing here locks the page.
   *
   * `data-lenis-prevent` below is not a lock — it only stops Lenis animating
   * the window on top of the browser's own scrolling, which is what let the
   * conversation scroll itself at all. Beyond that the gesture is left alone:
   * over the gap the site scrolls, over the conversation the conversation
   * scrolls, and when the conversation has no more to give the gesture carries
   * on to the page as it normally would.
   *
   * An earlier version swallowed that leftover gesture so the page could never
   * move while the pointer was inside the panel. It was removed on request:
   * being unable to scroll the page from wherever the pointer happens to be
   * reads as the page being broken, not as the panel being tidy.
   */

  // Follow the answer as it arrives, but never yank the view while someone is
  // reading further up.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || busy) return;

      const turnLang = lang;
      setDraft("");
      setBusy(true);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", text: question, lang: turnLang },
      ]);

      const answerId = crypto.randomUUID();
      let answerLang = turnLang;
      let opened = false;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: question, conversationId, forceLang: turnLang }),
        });

        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            const line = frame.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") continue;

            let event: Record<string, unknown>;
            try {
              event = JSON.parse(payload) as Record<string, unknown>;
            } catch {
              continue;
            }

            if (event.type === "conversation") {
              setConversationId(event.conversationId as string);
              // The brain resolves the answer's language, and it is allowed to
              // disagree with the toggle when someone types in the other one.
              answerLang = event.lang as Lang;
            }

            if (event.type === "delta") {
              const chunk = event.text as string;
              if (!opened) {
                opened = true;
                setMessages((prev) => [
                  ...prev,
                  { id: answerId, role: "bot", text: chunk, lang: answerLang },
                ]);
              } else {
                setMessages((prev) =>
                  prev.map((m) => (m.id === answerId ? { ...m, text: m.text + chunk } : m)),
                );
              }
            }

            if (event.type === "error") {
              setMessages((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  role: "bot",
                  text: (event.message as string) || t.failed,
                  lang: answerLang,
                },
              ]);
            }
          }
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "bot", text: t.failed, lang: turnLang },
        ]);
      } finally {
        setBusy(false);
        inputRef.current?.focus();
      }
    },
    [busy, conversationId, lang, t.failed],
  );

  if (hidden) return null;

  return (
    <div
      data-surface="chat"
      /*
       * This is what decides which of the two things scrolls, and it works
       * because Lenis asks the same question the reader does: where is the
       * pointer?
       *
       * Lenis intercepts the wheel on the window and animates the page itself,
       * so a plain `overflow-y: auto` on the conversation was never going to
       * win — the event was taken before the browser could scroll anything.
       * `data-lenis-prevent` makes Lenis walk up from whatever the event
       * actually landed on and stand down if it finds this attribute. Over a
       * panel it finds it, so the browser scrolls the conversation natively.
       * Over the gap around the panels the wrapper is transparent to pointer
       * events, so the event lands on the page underneath, Lenis finds nothing,
       * and the site scrolls as usual. The panels do not move either way.
       */
      data-lenis-prevent
      /* Full height even when closed. The wrapper takes no pointer events, so
         the site underneath stays clickable; what it buys is that the open
         conversation can claim the space between the bar and the bottom of the
         window rather than growing shorter or taller with every answer. */
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex h-svh flex-col gap-3 p-4"
    >
      {/* 1 — the way in. Closed, this is the whole thing: a question and five
          answers to it. Picking one opens the conversation and asks it. */}
      <div className={`${WIDTH} ${PANEL} pointer-events-auto relative flex shrink-0 items-center justify-center px-5`}
        style={{ height: barPx }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`${fontFor(lang)} block w-full text-center text-[0.9375rem] text-white`}
        >
          {t.title}
        </button>

        {open && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t.close}
            className="text-chat-dim absolute right-4 top-1/2 -translate-y-1/2 text-base leading-none transition-colors hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <>
          {/* 2 — the conversation. The only panel that scrolls. */}
          <div
            ref={scrollRef}
            className={`${WIDTH} ${PANEL} pointer-events-auto min-h-0 flex-1 overflow-y-auto px-6 py-7 sm:px-8`}
          >
            <div dir={lang === "fa" ? "rtl" : "ltr"}>
              <p
                className={`${fontFor(lang)} text-[1.0625rem] leading-[1.75] whitespace-pre-wrap text-white`}
              >
                {copy[lang].welcome}
              </p>

              {/* Under the greeting rather than in the bar above it: they are
                  three ways to start this conversation, so they belong where
                  the conversation starts. */}
              <div className="mt-5 flex flex-wrap gap-2">
                {TOPICS.map((topic) => {
                  const [label, question] = topic[lang];
                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={busy}
                      onClick={() => void send(question)}
                      className={`${fontFor(
                        lang,
                      )} rounded-full border border-white/20 px-4 py-1.5 text-[0.8125rem] text-white transition-colors hover:border-white/55 disabled:opacity-35`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-6">
              {messages.map((m) => (
                <p
                  key={m.id}
                  dir={m.lang === "fa" ? "rtl" : "ltr"}
                  className={[
                    fontFor(m.lang),
                    "text-[1.0625rem] leading-[1.75] whitespace-pre-wrap",
                    m.role === "user" ? "text-confirm-lit" : "text-white",
                  ].join(" ")}
                >
                  {m.text}
                </p>
              ))}

              {busy && (
                <p className="text-chat-dim font-nhm text-[1.0625rem]" aria-live="polite">
                  …
                </p>
              )}
            </div>
          </div>

          {/* 3 — the composer. */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(draft);
            }}
            className={`${WIDTH} ${PANEL} pointer-events-auto flex shrink-0 items-center gap-2 px-4`}
            style={{ height: barPx }}
          >
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(draft);
                }
              }}
              rows={1}
              /* Soft wrapping off. This field is one line by construction —
                 Enter sends — and with wrapping on, a placeholder longer than
                 the field broke onto a second line that the field's height then
                 cut in half. Off, the line simply scrolls. */
              wrap="off"
              dir={lang === "fa" ? "rtl" : "ltr"}
              placeholder={t.placeholder}
              aria-label={t.placeholder}
              /* Smaller than the conversation above it. The panel narrowed to a
                 third of the window and the placeholder stopped fitting on one
                 line in both languages — the field is the one place where the
                 text has nowhere to wrap to. */
              className={`${fontFor(
                lang,
              )} placeholder:text-chat-dim h-[1.75rem] min-w-0 flex-1 resize-none overflow-hidden bg-transparent py-0 text-[0.875rem] leading-[1.75rem] text-white outline-none`}
            />
            <button
              type="submit"
              disabled={busy || draft.trim() === ""}
              className={`${fontFor(
                lang,
              )} shrink-0 rounded-full border border-white/25 px-4 py-1.5 text-[0.875rem] text-white transition-colors hover:border-white/60 disabled:opacity-35 disabled:hover:border-white/25`}
            >
              {t.send}
            </button>
          </form>

          {/* 4 — the language switch. One button in the middle, naming the
              language it will move you to. Both labels stay in Latin script:
              «فارسی» would be unreadable to the very person who needs to press
              it, which is someone currently being spoken to in English. */}
          <div
            className={`${WIDTH} ${PANEL} pointer-events-auto flex shrink-0 items-center justify-center`}
            style={{ height: barPx }}
          >
            <button
              type="button"
              onClick={() => setLang((l) => (l === "en" ? "fa" : "en"))}
              className="font-nhm rounded-full px-6 py-1.5 text-[0.875rem] text-white transition-colors hover:bg-white/10"
            >
              {t.switchLabel}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
