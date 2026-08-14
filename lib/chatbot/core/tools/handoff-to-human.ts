import "server-only";

import { sendMessage } from "@/lib/chatbot/channels/telegram";
import { db } from "@/lib/chatbot/db/client";
import { siteUrl } from "@/lib/site-url";
import type { Tool } from "./index";

/**
 * Fetching Shabnam.
 *
 * A one-person brand has no operator pool, so "handoff" cannot mean a queue
 * somebody is watching. It means three things at once: the conversation is
 * flagged, a row goes into `handoffs`, and her phone buzzes. Any two of those
 * without the third is a queue nobody knows about — which is what the
 * `handoffs` table was from 0004 until now.
 *
 * The notification is best effort and the row is not. If Telegram is down or
 * the chat id is wrong, the handoff still exists and still shows in the panel;
 * losing the request because the messenger failed would be the worse of the two
 * failures. `notified_at` records which happened, so the panel can say "she has
 * not actually been told" rather than implying she has.
 */
export const handoffToHuman: Tool = {
  definition: {
    name: "handoff_to_human",
    description:
      "Tell Shabnam that this person needs her. Call this when they ask to " +
      "speak to her or to a person, or when what they are asking is hers to " +
      "answer rather than yours — a decision about their own plan, a price, " +
      "anything specific to their situation that the sources do not settle. " +
      "Do not call it merely because you are unsure; that is what saying you " +
      "do not know is for.",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description:
            "One sentence, in English, saying what they need her for. This is " +
            "what she reads before opening the conversation.",
        },
      },
      required: ["reason"],
      additionalProperties: false,
    },
  },

  async run(args, context) {
    const supabase = db();
    const reason =
      typeof args.reason === "string" && args.reason.trim()
        ? args.reason.trim()
        : "No reason given.";

    // One open handoff per conversation. Asking twice in one conversation is
    // the same request, and a second row would show as a second person waiting.
    const { data: waiting } = await supabase
      .from("handoffs")
      .select("id")
      .eq("conversation_id", context.conversationId)
      .is("released_at", null)
      .maybeSingle();

    if (waiting) {
      return "Shabnam has already been told about this conversation. Say so, and do not say when she will reply.";
    }

    const { data: created, error } = await supabase
      .from("handoffs")
      .insert({ conversation_id: context.conversationId, reason })
      .select("id")
      .single();

    if (error || !created) {
      throw new Error(error?.message ?? "The handoff could not be recorded.");
    }

    await supabase
      .from("conversations")
      .update({ status: "needs_human" })
      .eq("id", context.conversationId);

    const notified = await notify(context.conversationId, context.channel, reason);
    if (notified) {
      await supabase
        .from("handoffs")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", created.id);
    }

    return "Shabnam has been told. Tell them she has seen this, and do not say when she will reply.";
  },
};

/** Best effort: a failed message must not lose the handoff. */
async function notify(
  conversationId: string,
  channel: string,
  reason: string,
): Promise<boolean> {
  try {
    const { data } = await db()
      .from("settings")
      .select("value")
      .eq("key", "owner_telegram_chat_id")
      .maybeSingle();

    const chatId = Number(data?.value);
    if (!Number.isFinite(chatId) || chatId === 0) return false;

    const site = siteUrl();
    const link = site ? `\n\n${site}/admin/conversations/${conversationId}` : "";

    await sendMessage(
      chatId,
      `Someone needs you — on ${channel}.\n\n${reason}${link}`,
    );
    return true;
  } catch {
    return false;
  }
}
