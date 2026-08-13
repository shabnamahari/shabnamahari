import type { NextRequest } from "next/server";

import { converse } from "@/lib/chatbot/core/converse";
import { db } from "@/lib/chatbot/db/client";
import {
  EDIT_INTERVAL_MS,
  editMessage,
  sendMessage,
  sendTyping,
} from "@/lib/chatbot/channels/telegram";
import { TG } from "@/lib/chatbot/channels/telegram-copy";
import type { Lang } from "@/lib/chatbot/core/types";

/**
 * The Telegram channel's doorway, and nothing more.
 *
 * Same contract as `api/chat`: turn an update into a `ConverseInput`, turn the
 * events back into whatever this channel can show. Which language to answer in,
 * what to retrieve, when to call a tool — all of that is `converse()`. Nothing
 * here decides anything about the conversation, and if it ever starts to, the
 * brain is incomplete.
 *
 * Two things differ from the web, and both come from Telegram rather than from
 * us. It cannot stream, so the answer is posted early and edited as it arrives.
 * And it has no client to remember which conversation is open, so the open one
 * is looked up — which is also what makes `/reset` a real command rather than a
 * button that clears a screen.
 */

export const dynamic = "force-dynamic";
/** A turn on the free models has been measured at over a minute. */
export const maxDuration = 300;

const MAX_TEXT = 4000;

type Update = {
  message?: {
    message_id: number;
    chat: { id: number };
    from?: { id: number; language_code?: string };
    text?: string;
  };
};

/**
 * Telegram retries any update it does not get a 200 for, and it retries the
 * whole thing — so a slow turn that succeeded would be answered twice. Every
 * path here returns 200, and real failures are reported to the person in the
 * chat instead, where they can act on them.
 */
const ACK = new Response("ok", { status: 200 });

/** The language this person last chose, if they ever did. */
async function preferredLang(chatId: number): Promise<Lang | undefined> {
  const { data } = await db()
    .from("unified_users")
    .select("preferred_lang")
    .eq("channel", "telegram")
    .eq("external_id", String(chatId))
    .maybeSingle();

  return data?.preferred_lang === "fa" || data?.preferred_lang === "en"
    ? data.preferred_lang
    : undefined;
}

async function setPreferredLang(chatId: number, lang: Lang): Promise<void> {
  await db()
    .from("unified_users")
    .upsert(
      { channel: "telegram", external_id: String(chatId), preferred_lang: lang },
      { onConflict: "channel,external_id" },
    );
}

/** The conversation this chat is currently in, if one is still open. */
async function openConversation(chatId: number): Promise<string | undefined> {
  const { data } = await db()
    .from("conversations")
    .select("id")
    .eq("channel", "telegram")
    .eq("external_user_id", String(chatId))
    .eq("status", "open")
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id;
}

async function closeConversations(chatId: number): Promise<void> {
  await db()
    .from("conversations")
    .update({ status: "closed" })
    .eq("channel", "telegram")
    .eq("external_user_id", String(chatId))
    .eq("status", "open");
}

/** The greeting Shabnam wrote, or the channel's own line if there is none. */
async function greeting(lang: Lang): Promise<string> {
  const { data } = await db()
    .from("channel_copy")
    .select("welcome")
    .eq("channel", "telegram")
    .eq("lang", lang)
    .maybeSingle();

  if (data?.welcome) return data.welcome;

  const { data: web } = await db()
    .from("channel_copy")
    .select("welcome")
    .eq("channel", "web")
    .eq("lang", lang)
    .maybeSingle();

  return web?.welcome ?? TG[lang].help;
}

/**
 * Runs a turn, posting the answer as it arrives.
 *
 * The first tokens replace the placeholder rather than adding to it, so the
 * conversation does not fill with "…" that were never anything else.
 */
async function answer(
  chatId: number,
  text: string,
  lang: Lang,
  conversationId: string | undefined,
): Promise<void> {
  await sendTyping(chatId);

  const placeholder = await sendMessage(chatId, TG[lang].thinking);
  let answered = "";
  let posted = "";
  let lastEdit = 0;
  let failure: string | null = null;

  try {
    for await (const event of converse({
      channel: "telegram",
      externalUserId: String(chatId),
      text,
      conversationId,
      forceLang: lang,
    })) {
      if (event.type === "delta") {
        answered += event.text;

        const now = Date.now();
        if (placeholder && now - lastEdit >= EDIT_INTERVAL_MS && answered !== posted) {
          lastEdit = now;
          posted = answered;
          await editMessage(chatId, placeholder, answered);
        }
      } else if (event.type === "error") {
        failure = event.message;
      }
    }
  } catch (error) {
    // The generator throwing is a turn the brain could not finish, as opposed
    // to one it finished badly and reported.
    failure = error instanceof Error ? error.message : TG[lang].failed;
  }

  const final = answered.trim();

  if (final && final !== posted) {
    if (placeholder) await editMessage(chatId, placeholder, final);
    else await sendMessage(chatId, final);
    return;
  }

  if (final) return;

  // Nothing came back. Said out loud rather than left as a "…" that never
  // became anything — on the web that silence read as a broken page, and here
  // it would read as a bot that ignored you.
  if (failure) console.warn("[telegram] turn failed:", failure);
  const message = TG[lang].failed;
  if (placeholder) await editMessage(chatId, placeholder, message);
  else await sendMessage(chatId, message);
}

export async function POST(request: NextRequest): Promise<Response> {
  // Checked before anything is read or written. The URL is public and
  // guessable; this header is what makes a request actually be Telegram.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return new Response("forbidden", { status: 403 });
  }

  let update: Update;
  try {
    update = (await request.json()) as Update;
  } catch {
    return ACK;
  }

  const message = update.message;
  if (!message) return ACK;

  const chatId = message.chat.id;
  const text = message.text?.trim();

  // `language_code` is the Telegram interface language, which is a guess about
  // a person and not a statement by them. It seeds the first turn and is
  // overridden by anything they actually do.
  const stored = await preferredLang(chatId);
  const lang: Lang =
    stored ?? (message.from?.language_code?.startsWith("fa") ? "fa" : "en");

  if (!text) {
    await sendMessage(chatId, TG[lang].notText);
    return ACK;
  }

  if (text.startsWith("/")) {
    const command = text.split(/[\s@]/)[0].toLowerCase();

    if (command === "/start") {
      await closeConversations(chatId);
      await sendMessage(chatId, await greeting(lang));
      return ACK;
    }

    if (command === "/help") {
      await sendMessage(chatId, TG[lang].help);
      return ACK;
    }

    if (command === "/reset") {
      await closeConversations(chatId);
      await sendMessage(chatId, TG[lang].reset);
      return ACK;
    }

    if (command === "/lang") {
      const next: Lang = lang === "fa" ? "en" : "fa";
      await setPreferredLang(chatId, next);
      await sendMessage(chatId, TG[next].switched);
      return ACK;
    }

    // Any other slash word is a question that happens to start with one.
  }

  if (text.length > MAX_TEXT) {
    await sendMessage(chatId, TG[lang].tooLong);
    return ACK;
  }

  await answer(chatId, text, lang, await openConversation(chatId));
  return ACK;
}
