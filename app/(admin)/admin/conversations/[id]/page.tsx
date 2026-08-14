import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/chatbot/db/client";
import RetrievedSources, { type Source } from "@/components/admin/RetrievedSources";

export const dynamic = "force-dynamic";

type Message = {
  id: string;
  role: string;
  content: string;
  lang: string;
  from_human: boolean;
  model_used: string | null;
  cost: number | null;
  retrieved_chunk_ids: string[];
  created_at: string;
};

type ChunkRow = {
  id: string;
  document_id: string;
  content: string;
  lang: string;
  chunk_index: number;
};

/**
 * The passages behind a conversation, by chunk id.
 *
 * Two plain queries rather than one with an embedded `documents(title)`.
 * PostgREST decides whether an embed comes back as an object or a
 * one-element array from the relationship it infers, and a title that
 * silently resolves to `undefined` looks exactly like a document with no
 * name. Two selects have no inference in them to be wrong about.
 */
async function loadSources(ids: string[]): Promise<Map<string, Source>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();

  const client = db();
  const { data: chunkRows } = await client
    .from("chunks")
    .select("id, document_id, content, lang, chunk_index")
    .in("id", unique);

  const chunks = (chunkRows ?? []) as ChunkRow[];
  if (chunks.length === 0) return new Map();

  const { data: docRows } = await client
    .from("documents")
    .select("id, title")
    .in("id", [...new Set(chunks.map((c) => c.document_id))]);

  const titles = new Map(
    ((docRows ?? []) as { id: string; title: string }[]).map((d) => [d.id, d.title]),
  );

  return new Map(
    chunks.map((row) => [
      row.id,
      {
        id: row.id,
        title: titles.get(row.document_id) ?? "Untitled",
        lang: row.lang,
        chunkIndex: row.chunk_index,
        content: row.content,
      },
    ]),
  );
}

/**
 * One conversation, whole.
 *
 * Direction and font are set per message and never on the container, because a
 * Persian sentence inside an English conversation is normal here and locking
 * the container is what makes it unreadable. Same rule as the chat panel
 * itself.
 *
 * The `system` and `tool` turns are shown rather than hidden. They are where
 * the bot did something on the person's behalf — recorded a phone number, sent
 * the assessment link — and a transcript that omits them shows a conversation
 * nobody actually had.
 */
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const client = db();

  const { data: conversation } = await client
    .from("conversations")
    .select("id, channel, lang, status, summary, started_at, placement_link_sent_at")
    .eq("id", id)
    .maybeSingle();

  if (!conversation) notFound();

  const [{ data: messageRows }, { data: lead }, { data: gaps }] = await Promise.all([
    client
      .from("messages")
      .select(
      "id, role, content, lang, model_used, cost, retrieved_chunk_ids, from_human, created_at",
    )
      .eq("conversation_id", id)
      .order("created_at", { ascending: true }),
    client
      .from("leads")
      .select("id, name, contact, target_band, exam_date")
      .eq("conversation_id", id)
      .maybeSingle(),
    client
      .from("unanswered")
      .select("id, question, lang")
      .eq("conversation_id", id),
  ]);

  const messages = (messageRows ?? []) as Message[];
  const spent = messages.reduce((sum, m) => sum + Number(m.cost ?? 0), 0);

  // Every passage this conversation touched, fetched once and handed out per
  // message. One query rather than one per answer, and the same chunk retrieved
  // by three turns is read from the database once.
  //
  // A chunk can be gone — deleting a document takes its chunks with it, and the
  // knowledge base is edited from the panel. The id then resolves to nothing,
  // which is shown as a smaller count rather than an error: the answer was
  // grounded in something that no longer exists, and that is worth seeing
  // rather than crashing on.
  const sourcesById = await loadSources(
    messages.flatMap((message) => message.retrieved_chunk_ids),
  );

  return (
    <main className="mx-auto max-w-3xl px-[15px] py-16">
      <header className="border-rule border-b pb-6">
        <Link
          href="/admin/conversations"
          className="text-muted-ink hover:text-ink text-sm underline underline-offset-4 transition-colors"
        >
          ← Conversations
        </Link>
        <h1 className="font-nhm mt-3 text-2xl font-bold tracking-tight">
          {new Date(conversation.started_at as string).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </h1>
        <p className="text-muted-ink mt-1 text-sm tabular-nums">
          {conversation.channel as string} · {conversation.lang as string} ·{" "}
          {messages.length} message{messages.length === 1 ? "" : "s"}
          {/* Four decimals because a single turn on a cheap model rounds to
              zero cents, and "$0.00" beside a real number reads as free. */}
          {spent > 0 ? ` · $${spent.toFixed(4)}` : ""}
          {conversation.status !== "open" ? ` · ${conversation.status as string}` : ""}
        </p>
      </header>

      {lead ? (
        <section className="border-rule mt-8 border p-4">
          <h2 className="text-muted-ink text-xs tracking-wide uppercase">
            What they gave
          </h2>
          <p className="mt-2 text-[0.9375rem]">
            {[
              lead.name as string | null,
              lead.contact as string | null,
              lead.target_band ? `band ${lead.target_band}` : null,
              lead.exam_date ? `exam ${lead.exam_date}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <Link
            href="/admin/leads"
            className="text-muted-ink hover:text-ink mt-2 inline-block text-sm underline underline-offset-4 transition-colors"
          >
            Open in People
          </Link>
        </section>
      ) : null}

      <section className="mt-10 flex flex-col gap-6">
        {messages.map((message) => {
          const fa = message.lang === "fa";
          const aside = message.role === "system" || message.role === "tool";

          return (
            <article key={message.id}>
              <div className="text-muted-ink text-xs tracking-wide uppercase">
                {message.role === "user"
                  ? "Them"
                  : message.role === "assistant"
                    ? // Her replies are stored as `assistant` so the history the
                      // model reads is right, but crediting the bot with what
                      // she wrote would make the transcript lie about who spoke.
                      message.from_human
                      ? "You"
                      : "Sir Cue"
                    : message.role}
              </div>
              <p
                dir={fa ? "rtl" : "ltr"}
                className={`mt-1.5 leading-[1.7] whitespace-pre-wrap ${
                  fa ? "font-vazirmatn" : ""
                } ${
                  aside
                    ? "text-muted-ink border-rule border-s-2 ps-3 text-sm"
                    : "text-[0.9375rem]"
                }`}
              >
                {message.content}
              </p>
              {message.model_used ? (
                <>
                  <p className="text-muted-ink mt-1.5 text-xs tabular-nums">
                    {message.model_used}
                  </p>
                  <RetrievedSources
                    sources={message.retrieved_chunk_ids
                      .map((chunkId) => sourcesById.get(chunkId))
                      .filter((source): source is Source => Boolean(source))}
                  />
                </>
              ) : null}
            </article>
          );
        })}
      </section>

      {gaps && gaps.length > 0 ? (
        <section className="border-rule mt-14 border-t pt-6">
          <h2 className="text-muted-ink text-xs tracking-wide uppercase">
            Found nothing for
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {gaps.map((gap) => (
              <li
                key={gap.id as string}
                dir={gap.lang === "fa" ? "rtl" : "ltr"}
                className={`text-[0.9375rem] ${
                  gap.lang === "fa" ? "font-vazirmatn" : ""
                }`}
              >
                {gap.question as string}
              </li>
            ))}
          </ul>
          <p className="text-muted-ink mt-3 text-sm">
            Each of these is either something to write in the{" "}
            <Link href="/admin/knowledge" className="underline underline-offset-4">
              knowledge base
            </Link>
            , or something it was right to refuse.
          </p>
        </section>
      ) : null}

      {conversation.summary ? (
        <section className="border-rule mt-14 border-t pt-6">
          <h2 className="text-muted-ink text-xs tracking-wide uppercase">
            Earlier turns, summarised
          </h2>
          <p
            dir={conversation.lang === "fa" ? "rtl" : "ltr"}
            className={`text-muted-ink mt-3 text-sm leading-[1.7] ${
              conversation.lang === "fa" ? "font-vazirmatn" : ""
            }`}
          >
            {conversation.summary as string}
          </p>
        </section>
      ) : null}
    </main>
  );
}
