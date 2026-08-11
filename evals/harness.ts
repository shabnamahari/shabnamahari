import { randomUUID } from "node:crypto";

import { converse } from "@/lib/chatbot/core/converse";
import { db } from "@/lib/chatbot/db/client";
import type { Citation, Lang } from "@/lib/chatbot/core/types";

/**
 * Runs a conversation against the real brain and collects everything the checks
 * need to judge it.
 *
 * Against the real brain, not a mock, because the thing being tested is the
 * combination — this prompt, this model, this knowledge base. A mocked model
 * would pass every time and tell us nothing about the day someone switches the
 * model in the panel, which is the exact event this suite exists to catch.
 */

/** Marks every row these tests create, so the cleanup can find them again. */
export const EVAL_USER_PREFIX = "eval-";

export type TurnResult = {
  question: string;
  answer: string;
  lang: Lang;
  citations: Citation[];
  /** The text of every chunk the answer was grounded in, for the number check. */
  sourceText: string;
  model: string;
  costUsd: number;
};

export type ConversationResult = {
  conversationId: string;
  turns: TurnResult[];
  /** Convenience for the common single-turn case. */
  last: TurnResult;
};

export async function runConversation(questions: string[]): Promise<ConversationResult> {
  const externalUserId = `${EVAL_USER_PREFIX}${randomUUID()}`;
  let conversationId: string | undefined;
  const turns: TurnResult[] = [];

  for (const question of questions) {
    let answer = "";
    let citations: Citation[] = [];
    let lang: Lang = "en";
    let model = "";
    let costUsd = 0;
    let failure: string | null = null;

    for await (const event of converse({
      channel: "web",
      externalUserId,
      text: question,
      conversationId,
    })) {
      switch (event.type) {
        case "conversation":
          conversationId = event.conversationId;
          lang = event.lang;
          break;
        case "sources":
          citations = event.citations;
          break;
        case "delta":
          answer += event.text;
          break;
        case "done":
          model = event.model;
          costUsd = event.costUsd;
          break;
        case "error":
          failure = event.message;
          break;
      }
    }

    if (failure) throw new Error(`converse failed on "${question}": ${failure}`);

    turns.push({
      question,
      answer,
      lang,
      citations,
      sourceText: await sourceTextFor(conversationId!),
      model,
      costUsd,
    });
  }

  return { conversationId: conversationId!, turns, last: turns[turns.length - 1] };
}

/**
 * The text of the chunks that grounded the most recent answer.
 *
 * Read back from `messages.retrieved_chunk_ids` rather than captured during the
 * stream, because that column is what the panel will show when someone asks why
 * the bot said something — so the check and the audit trail read the same thing.
 */
async function sourceTextFor(conversationId: string): Promise<string> {
  const { data: message } = await db()
    .from("messages")
    .select("retrieved_chunk_ids")
    .eq("conversation_id", conversationId)
    .eq("role", "assistant")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const ids = message?.retrieved_chunk_ids ?? [];
  if (ids.length === 0) return "";

  const { data: chunks } = await db().from("chunks").select("content").in("id", ids);
  return (chunks ?? []).map((c) => c.content).join("\n\n");
}

/** Settings the checks read, fetched once per run rather than per assertion. */
export async function evalSettings() {
  const { data } = await db()
    .from("settings")
    .select("key, value")
    .in("key", ["banned_words", "fa_latin_allowlist", "placement_url"]);

  const map = new Map((data ?? []).map((row) => [row.key, row.value]));
  return {
    bannedWords: (map.get("banned_words") as Record<Lang, string[]>) ?? { en: [], fa: [] },
    latinAllowlist: (map.get("fa_latin_allowlist") as string[]) ?? [],
    placementUrl: (map.get("placement_url") as string) ?? "",
  };
}

/**
 * Removes everything the run created.
 *
 * Without this the panel's inbox fills with test conversations, and its lead
 * list fills with people who do not exist.
 *
 * Order matters, and not in the obvious way. `messages`, `feedback` and
 * `handoffs` cascade from the conversation, so deleting it takes them with it.
 * But `leads`, `intake_log` and `unanswered` are declared `on delete set null`
 * — deliberately, because a lead has to outlive the conversation that produced
 * it — so deleting conversations first would leave those rows in place with
 * nothing left to identify them by. They are removed first, while they can
 * still be found.
 */
export async function cleanupEvalData(): Promise<number> {
  const supabase = db();

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id")
    .like("external_user_id", `${EVAL_USER_PREFIX}%`);

  const ids = (conversations ?? []).map((c) => c.id);

  if (ids.length > 0) {
    for (const table of ["leads", "intake_log", "unanswered"] as const) {
      await supabase.from(table).delete().in("conversation_id", ids);
    }
    await supabase.from("conversations").delete().in("id", ids);
  }

  await supabase.from("unified_users").delete().like("external_id", `${EVAL_USER_PREFIX}%`);

  return ids.length;
}
