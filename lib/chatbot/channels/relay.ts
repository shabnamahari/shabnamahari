import "server-only";

import { sendMessage } from "./telegram";
import { db } from "@/lib/chatbot/db/client";

/**
 * Carrying messages between Shabnam and someone talking to the bot.
 *
 * She cannot reach these people. Somebody who writes to @SirCue_bot has no chat
 * with her and Telegram offers no way to open one, so the bot is the only road
 * and it has to run in both directions: their question appears in her chat, she
 * replies to it, and the bot delivers her words under its own name.
 *
 * Every message the bot puts in her chat is recorded against the conversation
 * it belongs to, because a Telegram reply carries only the id of what is being
 * replied to. That mapping is the whole mechanism.
 */

/** Her chat, from settings rather than an env var so it can be corrected live. */
export async function ownerChatId(): Promise<number | null> {
  const { data } = await db()
    .from("settings")
    .select("value")
    .eq("key", "owner_telegram_chat_id")
    .maybeSingle();

  const id = Number(data?.value);
  return Number.isFinite(id) && id !== 0 ? id : null;
}

/** Remembers which conversation a message in her chat is about. */
export async function rememberRelay(
  ownerMessageId: number | null,
  conversationId: string,
): Promise<void> {
  if (!ownerMessageId) return;
  await db()
    .from("telegram_relay")
    .upsert(
      { owner_message_id: ownerMessageId, conversation_id: conversationId },
      { onConflict: "owner_message_id" },
    );
}

export async function relayedConversation(
  ownerMessageId: number,
): Promise<string | null> {
  const { data } = await db()
    .from("telegram_relay")
    .select("conversation_id")
    .eq("owner_message_id", ownerMessageId)
    .maybeSingle();

  return data?.conversation_id ?? null;
}

/**
 * Shows her a message from someone she has taken over from the bot.
 *
 * Prefixed with a name she can scan, because several conversations can be live
 * at once and they all arrive in the same chat. Without it, two people asking
 * about payment on the same afternoon are indistinguishable, and a reply lands
 * on the wrong one.
 */
export async function forwardToOwner(
  conversationId: string,
  text: string,
  who: string,
): Promise<void> {
  const owner = await ownerChatId();
  if (!owner) return;

  const messageId = await sendMessage(
    owner,
    `${who}:\n\n${text}\n\nReply to answer · /back to hand it back to Sir Cue`,
  );
  await rememberRelay(messageId, conversationId);
}

/**
 * Delivers her reply to the person, and records it as part of the conversation.
 *
 * Stored as `assistant` because that is the side it is on — the model reads the
 * history and has to see what was already said to this person — with
 * `from_human` set, so the panel can say who actually wrote it.
 */
export async function deliverToPerson(
  conversationId: string,
  text: string,
): Promise<
  { ok: true } | { ok: false; reason: "no-channel" | "not-telegram" | "refused" }
> {
  const { data: conversation } = await db()
    .from("conversations")
    .select("channel, external_user_id, lang")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation) return { ok: false, reason: "no-channel" };

  // The web and the widget have no way to receive a push. Someone who asked
  // from the site has closed the tab by now, and saying so is better than
  // reporting a delivery that did not happen.
  if (conversation.channel !== "telegram") {
    return { ok: false, reason: "not-telegram" };
  }

  const theirChat = Number(conversation.external_user_id);
  if (!Number.isFinite(theirChat) || theirChat === 0) {
    return { ok: false, reason: "no-channel" };
  }

  // Checked, not assumed. `sendMessage` returns null when Telegram refuses —
  // a blocked bot, a deleted account — and reporting "Sent." for a message that
  // never arrived is the same failure 0017 was written about: the claim and the
  // act have to be one thing. Recording it in the transcript would be worse
  // still, since the history the model reads would contain an answer this
  // person never saw.
  const delivered = await sendMessage(theirChat, text);
  if (delivered === null) return { ok: false, reason: "refused" };

  await db().from("messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content: text,
    lang: conversation.lang,
    from_human: true,
  });

  await db()
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  return { ok: true };
}

/**
 * Takes a conversation over, from Telegram, without opening the panel.
 *
 * The panel's button does the same two writes. Doing it here as well is the
 * point of the whole feature: the notification arrives on her phone, and
 * replying to it should be the entire interaction. Requiring a login first
 * would put a laptop between her and the answer.
 */
export async function claimFromTelegram(conversationId: string): Promise<void> {
  await db()
    .from("conversations")
    .update({ status: "human_active" })
    .eq("id", conversationId);

  await db()
    .from("handoffs")
    .update({ claimed_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .is("claimed_at", null)
    .is("released_at", null);
}

/** Hands it back: the bot answers again from the next message. */
export async function releaseFromTelegram(conversationId: string): Promise<void> {
  await db()
    .from("conversations")
    .update({ status: "open" })
    .eq("id", conversationId);

  await db()
    .from("handoffs")
    .update({ released_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .is("released_at", null);
}
