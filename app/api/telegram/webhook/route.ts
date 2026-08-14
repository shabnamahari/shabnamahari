import type { NextRequest } from "next/server";

import { converse } from "@/lib/chatbot/core/converse";
import { db } from "@/lib/chatbot/db/client";
import {
  EDIT_INTERVAL_MS,
  editMessage,
  sendMessage,
  sendTyping,
} from "@/lib/chatbot/channels/telegram";
import {
  claimFromTelegram,
  deliverToPerson,
  forwardToOwner,
  ownerChatId,
  relayedConversation,
  releaseFromTelegram,
} from "@/lib/chatbot/channels/relay";
import { TG } from "@/lib/chatbot/channels/telegram-copy";
import { allowTurn } from "@/lib/chatbot/core/rate-limit";
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
    from?: { id: number; language_code?: string; first_name?: string };
    text?: string;
    /** Set when this message is a reply. The relay is built entirely on it. */
    reply_to_message?: { message_id: number };
  };
};

/**
 * Telegram retries any update it does not get a 200 for, and it retries the
 * whole thing — so a slow turn that succeeded would be answered twice. Every
 * path here returns 200, and real failures are reported to the person in the
 * chat instead, where they can act on them.
 */
const ACK = new Response("ok", { status: 200 });

/** Replying with this hands the conversation back to the bot. */
const RELEASE = "/back";

/**
 * What the bot says to Shabnam, as opposed to what it says to anyone else.
 *
 * English, and short. These are receipts rather than copy: they are read once,
 * by the person who asked for them, to find out whether the thing happened.
 */
const OWNER = {
  delivered: "Sent. Sir Cue stays quiet here until you reply /back.",
  released: "Given back to Sir Cue.",
  notTelegram:
    "That one came from the website, so there is nothing to send a message to. If they left a number it is on the People page.",
  lost: "That did not send — I could not find where to send it.",
  refused:
    "Telegram would not deliver that. They may have blocked the bot. Nothing was recorded, so nothing shows in the transcript that they never saw.",
} as const;

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

/**
 * The conversation this chat is currently in, if it has not been closed.
 *
 * Anything but `closed`, not `open` alone. `open` was wrong the moment a
 * handoff existed: it sets the conversation to `needs_human`, so the person's
 * very next message found nothing and started a brand new conversation — with
 * no history, and a second handoff for the same request. Shabnam's first real
 * test produced exactly that, two conversations twenty-six seconds apart, and
 * her reply went to the one that was no longer live.
 *
 * `human_active` has to be included for the same reason and a worse one: that
 * is the state where she is answering, and a fresh conversation beside it would
 * be answered by the bot while she believed she was the one talking.
 */
async function openConversation(chatId: number): Promise<string | undefined> {
  const { data } = await db()
    .from("conversations")
    .select("id")
    .eq("channel", "telegram")
    .eq("external_user_id", String(chatId))
    .neq("status", "closed")
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id;
}

/**
 * `/start` and `/reset`: everything this chat had is finished.
 *
 * Any handoff still standing is released with it. Someone starting over has
 * left the conversation Shabnam was asked into, and a queue entry pointing at
 * an abandoned conversation is a person she thinks is waiting who is not.
 */
async function closeConversations(chatId: number): Promise<void> {
  const supabase = db();

  const { data: live } = await supabase
    .from("conversations")
    .select("id")
    .eq("channel", "telegram")
    .eq("external_user_id", String(chatId))
    .neq("status", "closed");

  const ids = (live ?? []).map((c) => c.id);
  if (ids.length === 0) return;

  await supabase
    .from("handoffs")
    .update({ released_at: new Date().toISOString() })
    .in("conversation_id", ids)
    .is("released_at", null);

  await supabase.from("conversations").update({ status: "closed" }).in("id", ids);
}

/** Whether Shabnam is in this conversation, which silences the model. */
async function heldByHuman(conversationId: string): Promise<boolean> {
  const { data } = await db()
    .from("conversations")
    .select("status")
    .eq("id", conversationId)
    .maybeSingle();

  return data?.status === "human_active";
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
  /** Only a language they chose with `/lang`. A guess must not be forced. */
  forceLang: Lang | undefined,
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
      forceLang,
    })) {
      // The brain decides what language this turn is in, and says so before the
      // first token. Taken rather than assumed, so a failure further down is
      // reported in the language of the answer rather than of the guess.
      if (event.type === "conversation") {
        lang = event.lang;
      } else if (event.type === "delta") {
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

  // Shabnam replying to something the bot showed her, before anything else.
  //
  // Her chat is the only one where a reply means this, and it has to be checked
  // ahead of the ordinary path — otherwise her answer to somebody would be read
  // as a question and handed to the model.
  const owner = await ownerChatId();
  if (owner && chatId === owner && message.reply_to_message && text) {
    const conversationId = await relayedConversation(
      message.reply_to_message.message_id,
    );

    // A reply to anything else in her chat is just a message to the bot, and
    // falls through to the normal path below.
    if (conversationId) {
      if (text.toLowerCase() === RELEASE) {
        await releaseFromTelegram(conversationId);
        await sendMessage(chatId, OWNER.released);
        return ACK;
      }

      // Claiming and answering in one act. She may never have opened the panel,
      // and that is the point: the notification arrives on her phone and the
      // reply is the whole interaction.
      await claimFromTelegram(conversationId);
      const sent = await deliverToPerson(conversationId, text);

      await sendMessage(
        chatId,
        sent.ok
          ? OWNER.delivered
          : sent.reason === "not-telegram"
            ? OWNER.notTelegram
            : sent.reason === "refused"
              ? OWNER.refused
              : OWNER.lost,
      );
      return ACK;
    }
  }

  // `language_code` is the Telegram interface language, which is a guess about
  // a person and not a statement by them.
  //
  // The distinction is load-bearing and was being thrown away. `lang` below
  // picks the channel's own copy — the placeholder, the failure line — and for
  // that a guess is fine. `stored` is different: it is only ever written by
  // `/lang`, so it is the one thing here a person actually chose, and it is the
  // only thing passed to the brain as `forceLang`.
  //
  // Passing the guess as well meant Shabnam, whose Telegram is in English,
  // wrote «میخوام با شبنم صحبت کنم» and was answered in English — and would
  // have been forever, because `forceLang` wins unconditionally and no amount
  // of Persian could move it. The language of a conversation is decided by
  // what someone writes, which is what `nextConversationLang` is for.
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

  // Counted per chat, and not per address: every Telegram update arrives from
  // Telegram's own servers, so an address limit here would be one bucket shared
  // by everybody and the first busy conversation would lock out the rest.
  //
  // After the commands, so /reset and /lang still work for someone who has hit
  // it — the way out of a rate limit should not itself be rate limited. And
  // before the conversation lookup, so a refusal costs one write rather than a
  // read, a turn and an embedding.
  if (!(await allowTurn(`tg:${chatId}`))) {
    await sendMessage(chatId, TG[lang].tooMany);
    return ACK;
  }

  const conversationId = await openConversation(chatId);

  // While Shabnam holds this conversation the model does not run at all, and
  // the message goes to her phone instead.
  //
  // Nothing is said back to the person here. They are mid-conversation with a
  // human who has already answered them once; a bot interrupting to announce
  // that a human is present is noise, and "she will reply shortly" is a promise
  // about timing that nobody asked it to make.
  if (conversationId && (await heldByHuman(conversationId))) {
    await forwardToOwner(
      conversationId,
      text,
      message.from?.first_name?.trim() || "Someone",
    );
    return ACK;
  }

  await answer(chatId, text, lang, conversationId, stored);
  return ACK;
}
