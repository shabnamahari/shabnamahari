import Link from "next/link";

import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/chatbot/db/client";

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

/**
 * What people actually asked.
 *
 * The opening question is the whole row. Everything else — channel, language,
 * length — is a filter you apply after something in the wording catches your
 * eye, so the wording is what gets the space and the rest is set small beside
 * it.
 */
export default async function ConversationsPage() {
  await requireAdmin();
  const client = db();

  const { data } = await client
    .from("conversations")
    .select(
      "id, channel, lang, status, started_at, last_message_at, placement_link_sent_at",
    )
    .order("last_message_at", { ascending: false })
    .limit(RECENT);

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

  return (
    <main className="mx-auto max-w-3xl px-[15px] py-16">
      <header className="border-rule border-b pb-6">
        <Link
          href="/admin"
          className="text-muted-ink hover:text-ink text-sm underline underline-offset-4 transition-colors"
        >
          ← Panel
        </Link>
        <h1 className="font-nhm mt-3 text-2xl font-bold tracking-tight">
          Conversations
        </h1>
        <p className="text-muted-ink mt-1 text-sm">
          What people actually asked, in the order they last said it. The most
          recent {RECENT}.
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="text-muted-ink mt-12 text-sm">
          Nothing yet. Every message to the chat panel, the widget or the
          Telegram bot lands here.
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
