import Link from "next/link";

import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/chatbot/db/client";
import ConversationFilters from "@/components/admin/ConversationFilters";

export const dynamic = "force-dynamic";

/**
 * How many conversations the list goes back.
 *
 * A cap rather than pagination, because the useful window here is "lately" —
 * anything older is a question about volume, which is the dashboard's job, not
 * this page's. Raise it when it starts cutting off something someone wanted.
 */
const RECENT = 60;

type Row = {
  id: string;
  channel: string;
  lang: string;
  status: string;
  started_at: string;
  last_message_at: string;
  placement_link_sent_at: string | null;
};

type Msg = {
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
};

type Marked = {
  id: string;
  conversationId: string;
  lang: string;
  answer: string;
  comment: string | null;
};

/** How much of a marked answer the list shows before you open it. */
const EXCERPT = 220;

/** Values the filters accept, so a hand-edited URL cannot ask for anything else. */
const CHANNELS = ["web", "telegram", "widget"];
const LANGS = ["en", "fa"];

/**
 * Answers somebody said were wrong.
 *
 * Two queries rather than an embed, for the same reason as the passages on the
 * transcript: PostgREST's shape depends on a relationship it infers, and a
 * field that silently resolves to undefined is indistinguishable from an empty
 * one.
 */
async function markedWrong(): Promise<Marked[]> {
  const client = db();

  const { data: rows } = await client
    .from("feedback")
    .select("id, message_id, comment, created_at")
    .eq("rating", -1)
    .order("created_at", { ascending: false })
    .limit(30);

  const feedback = (rows ?? []) as {
    id: string;
    message_id: string;
    comment: string | null;
  }[];
  if (feedback.length === 0) return [];

  const { data: answers } = await client
    .from("messages")
    .select("id, conversation_id, lang, content")
    .in(
      "id",
      feedback.map((f) => f.message_id),
    );

  const byId = new Map(
    ((answers ?? []) as {
      id: string;
      conversation_id: string;
      lang: string;
      content: string;
    }[]).map((m) => [m.id, m]),
  );

  return feedback.flatMap((item) => {
    const message = byId.get(item.message_id);
    // The answer can be gone — clearing the conversations takes its messages
    // with it and the feedback row cascades, but a read between the two would
    // otherwise render a row with no text in it.
    if (!message) return [];
    return [
      {
        id: item.id,
        conversationId: message.conversation_id,
        lang: message.lang,
        answer:
          message.content.length > EXCERPT
            ? `${message.content.slice(0, EXCERPT).trimEnd()}…`
            : message.content,
        comment: item.comment,
      },
    ];
  });
}

/**
 * What people actually asked.
 *
 * The opening question is the whole row. Everything else — channel, language,
 * length — is a filter you apply after something in the wording catches your
 * eye, so the wording is what gets the space and the rest is set small beside
 * it.
 */
export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; channel?: string; lang?: string }>;
}) {
  await requireAdmin();
  const client = db();

  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const channel = CHANNELS.includes(params.channel ?? "") ? params.channel! : "";
  const lang = LANGS.includes(params.lang ?? "") ? params.lang! : "";

  // What was said lives in `messages`, so a search runs there first and the
  // conversation list is narrowed to what it found. Two queries rather than a
  // join, and it is the right shape anyway: someone searching "refund" wants
  // the conversations refunds were mentioned in, not the messages.
  let matchedIds: string[] | null = null;
  if (q) {
    const { data: hits } = await client
      .from("messages")
      .select("conversation_id")
      // `%` and `_` are wildcards to Postgres, so unescaped, "50%" also matched
      // "5000" and "a_b" also matched "axb". Checked against the database
      // rather than assumed, and escaped, because someone typing a percent sign
      // means a percent sign.
      //
      // `*` is deliberately left alone. PostgREST turns it into `%` before
      // Postgres sees it, so it cannot be escaped here — and it behaves the way
      // a person would expect a star in a search box to behave, which makes it
      // the one wildcard worth keeping.
      .ilike("content", `%${q.replace(/[\\%_]/g, "\\$&")}%`)
      .limit(2000);

    matchedIds = [
      ...new Set(((hits ?? []) as { conversation_id: string }[]).map((h) => h.conversation_id)),
    ];
  }

  let query = client
    .from("conversations")
    .select(
      "id, channel, lang, status, started_at, last_message_at, placement_link_sent_at",
    )
    .order("last_message_at", { ascending: false })
    .limit(RECENT);

  if (channel) query = query.eq("channel", channel);
  if (lang) query = query.eq("lang", lang);
  // An empty array is a search that found nothing, which must return nothing —
  // not everything, which is what leaving the filter off would do.
  if (matchedIds) query = query.in("id", matchedIds);

  const { data } = await query;

  const rows = (data ?? []) as Row[];
  const ids = rows.map((row) => row.id);

  // Two lookups rather than a join, because PostgREST cannot aggregate on the
  // embedded side. At this volume that is cheaper than it looks; if the list
  // ever grows past a few hundred, the count belongs in a view.
  const [{ data: messages }, { data: leadRows }] = await Promise.all([
    ids.length
      ? client
          .from("messages")
          .select("conversation_id, role, content, created_at")
          .in("conversation_id", ids)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as Msg[] }),
    ids.length
      ? client.from("leads").select("conversation_id, name, contact").in("conversation_id", ids)
      : Promise.resolve({ data: [] as { conversation_id: string }[] }),
  ]);

  const turns = new Map<string, number>();
  const opening = new Map<string, string>();
  for (const message of (messages ?? []) as Msg[]) {
    turns.set(message.conversation_id, (turns.get(message.conversation_id) ?? 0) + 1);
    if (message.role === "user" && !opening.has(message.conversation_id)) {
      opening.set(message.conversation_id, message.content);
    }
  }

  const gaveDetails = new Set(
    ((leadRows ?? []) as { conversation_id: string }[]).map((r) => r.conversation_id),
  );

  const marked = await markedWrong();

  return (
    <main className="mx-auto max-w-3xl px-gutter py-16">
      <header className="border-rule border-b pb-6">
        <Link
          href="/admin"
          className="text-muted-ink hover:text-ink text-sm underline underline-offset-4 transition-colors"
        >
          ← Panel
        </Link>
        <h1 className="font-instrument-sans mt-3 text-2xl font-bold tracking-tight">
          Conversations
        </h1>
        <p className="text-muted-ink mt-1 text-sm">
          What people actually asked, in the order they last said it. The most
          recent {RECENT}, or whatever the search finds.
        </p>
      </header>

      <ConversationFilters q={q} channel={channel} lang={lang} />

      {marked.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-muted-ink text-xs tracking-wide uppercase">
            Marked wrong · {marked.length}
          </h2>
          <p className="text-muted-ink mt-2 text-sm">
            Answers a reader said were not right. This is the only place a
            confidently wrong answer shows up — an answer the bot found nothing
            for is in the knowledge base as a gap, but one it got wrong while
            sounding certain leaves no other trace.
          </p>
          <ul className="border-rule mt-4 border-t">
            {marked.map((item) => {
              const fa = item.lang === "fa";
              return (
                <li key={item.id} className="border-rule border-b py-3">
                  <Link
                    href={`/admin/conversations/${item.conversationId}`}
                    className="hover:bg-white/60 -mx-2 block px-2 py-1 transition-colors"
                  >
                    <p
                      dir={fa ? "rtl" : "ltr"}
                      className={`text-[0.9375rem] ${fa ? "font-vazirmatn" : ""}`}
                    >
                      {item.answer}
                    </p>
                    {item.comment ? (
                      <p
                        dir={fa ? "rtl" : "ltr"}
                        className={`text-muted-ink mt-1.5 text-sm ${
                          fa ? "font-vazirmatn" : ""
                        }`}
                      >
                        {/* Their words about it, when they wrote any. Most will
                            not, which is why the mark is recorded first. */}
                        “{item.comment}”
                      </p>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-muted-ink mt-12 text-sm">
          {q || channel || lang
            ? "Nothing matches that."
            : "Nothing yet. Every message to the chat panel, the widget or the Telegram bot lands here."}
        </p>
      ) : (
        <ul className="border-rule mt-10 border-t">
          {rows.map((row) => {
            const question = opening.get(row.id);
            const fa = row.lang === "fa";

            return (
              <li key={row.id} className="border-rule border-b">
                <Link
                  href={`/admin/conversations/${row.id}`}
                  className="hover:bg-white/60 block py-4 transition-colors"
                >
                  <p
                    dir={fa ? "rtl" : "ltr"}
                    className={`text-[0.9375rem] ${fa ? "font-vazirmatn" : ""}`}
                  >
                    {question ?? (
                      <span className="text-muted-ink">
                        Opened, nothing said
                      </span>
                    )}
                  </p>
                  <p className="text-muted-ink mt-1.5 text-xs tabular-nums">
                    {row.channel} · {row.lang} · {turns.get(row.id) ?? 0} message
                    {(turns.get(row.id) ?? 0) === 1 ? "" : "s"} ·{" "}
                    {new Date(row.last_message_at).toLocaleDateString("en-GB")}
                    {row.placement_link_sent_at ? " · sent the link" : ""}
                    {gaveDetails.has(row.id) ? " · left details" : ""}
                    {row.status !== "open" ? ` · ${row.status}` : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-muted-ink mt-14 text-sm">
        The people who left a name or a number are gathered on{" "}
        <Link href="/admin/leads" className="underline underline-offset-4">
          People
        </Link>
        .
      </p>
    </main>
  );
}
