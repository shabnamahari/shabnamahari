import Link from "next/link";

import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/chatbot/db/client";
import QueueRow, { type Waiting } from "@/components/admin/QueueRow";

export const dynamic = "force-dynamic";

type HandoffRow = {
  id: string;
  conversation_id: string;
  reason: string | null;
  notified_at: string | null;
  claimed_at: string | null;
  created_at: string;
};

/**
 * Who asked for you.
 *
 * Oldest first, which is the opposite of every other list in this panel. The
 * others are read newest first because you are catching up; this one is worked
 * through, and the person who has been waiting longest is the one to answer.
 */
export default async function QueuePage() {
  const admin = await requireAdmin();
  const client = db();

  const { data } = await client
    .from("handoffs")
    .select("id, conversation_id, reason, notified_at, claimed_at, created_at")
    .is("released_at", null)
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as HandoffRow[];
  const ids = rows.map((row) => row.conversation_id);

  const [{ data: conversations }, { data: messages }] = await Promise.all([
    ids.length
      ? client.from("conversations").select("id, channel, lang").in("id", ids)
      : Promise.resolve({ data: [] as { id: string; channel: string; lang: string }[] }),
    ids.length
      ? client
          .from("messages")
          .select("conversation_id, role, content, created_at")
          .in("conversation_id", ids)
          .eq("role", "user")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as { conversation_id: string; content: string }[] }),
  ]);

  const meta = new Map(
    ((conversations ?? []) as { id: string; channel: string; lang: string }[]).map(
      (c) => [c.id, c],
    ),
  );

  // Their most recent message, not their first: by the time someone asks for a
  // person, the opening question is rarely the thing they are still waiting on.
  const latest = new Map<string, string>();
  for (const message of (messages ?? []) as {
    conversation_id: string;
    content: string;
  }[]) {
    if (!latest.has(message.conversation_id)) {
      latest.set(message.conversation_id, message.content);
    }
  }

  const waiting: Waiting[] = rows.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    reason: row.reason,
    channel: meta.get(row.conversation_id)?.channel ?? "web",
    lang: meta.get(row.conversation_id)?.lang ?? "en",
    notified: Boolean(row.notified_at),
    claimed: Boolean(row.claimed_at),
    createdAt: row.created_at,
    question: latest.get(row.conversation_id) ?? null,
  }));

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
          Waiting for you
        </h1>
        <p className="text-muted-ink mt-1 text-sm">
          Conversations where Sir Cue decided the answer was yours to give.
          Longest wait first.
        </p>
      </header>

      {admin.role !== "owner" ? (
        <p className="text-muted-ink mt-8 text-sm">
          This account can read but not change anything.
        </p>
      ) : null}

      {waiting.length === 0 ? (
        <p className="text-muted-ink mt-12 text-sm">
          Nobody is waiting. The bot asks for you when someone wants to speak to
          a person, or when what they are asking is yours to answer — and your
          Telegram gets the message at the same moment.
        </p>
      ) : (
        <ul className="border-rule mt-10 border-t">
          {waiting.map((row) => (
            <QueueRow
              key={row.id}
              waiting={row}
              canEdit={admin.role === "owner"}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
