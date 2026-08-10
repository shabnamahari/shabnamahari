import "server-only";

import { db } from "@/lib/chatbot/db/client";
import { getActivePrompt, getModelConfig, getRetrievalConfig } from "./config";
import { OpenRouterError, stream, type ChatMessage } from "./generate/openrouter";
import { nextConversationLang } from "./ingest/lang";
import { search } from "./retrieve/search";
import type {
  Citation,
  ConverseEvent,
  ConverseInput,
  Lang,
  RetrievedChunk,
} from "./types";

/**
 * The brain's only entry point.
 *
 * Every channel — the full page, the widget, Telegram — calls this and renders
 * the events it yields. Nothing about HTTP, React or Telegram appears below
 * this line, and no channel is allowed to hold conversation logic of its own:
 * if one ever needs to, the omission is here.
 */

/** How many past turns to send. Older ones live in `conversations.summary`. */
const HISTORY_TURNS = 10;

async function loadOrCreateConversation(
  input: ConverseInput,
): Promise<{ id: string; lang: Lang; faInformal: boolean; placementLinkSent: boolean }> {
  const supabase = db();

  if (input.conversationId) {
    const { data, error } = await supabase
      .from("conversations")
      .select("id, lang, fa_informal, placement_link_sent_at")
      .eq("id", input.conversationId)
      .single();
    if (error || !data) throw new Error(`unknown conversation: ${input.conversationId}`);
    return {
      id: data.id,
      lang: data.lang,
      faInformal: data.fa_informal,
      placementLinkSent: Boolean(data.placement_link_sent_at),
    };
  }

  // One person, one row per channel. `upsert` rather than select-then-insert so
  // two rapid first messages cannot race into two users.
  const { data: user } = await supabase
    .from("unified_users")
    .upsert(
      {
        channel: input.channel,
        external_id: input.externalUserId,
        last_seen: new Date().toISOString(),
      },
      { onConflict: "channel,external_id" },
    )
    .select("id, preferred_lang")
    .single();

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      channel: input.channel,
      user_id: user?.id ?? null,
      external_user_id: input.externalUserId,
      // English by default. A returning person's remembered language is only a
      // starting point — their first full sentence still overrides it.
      lang: input.forceLang ?? user?.preferred_lang ?? "en",
    })
    .select("id, lang, fa_informal")
    .single();

  if (error || !data) throw new Error(`conversation insert failed: ${error?.message}`);
  return { id: data.id, lang: data.lang, faInformal: false, placementLinkSent: false };
}

async function loadHistory(conversationId: string): Promise<ChatMessage[]> {
  const { data } = await db()
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: false })
    .limit(HISTORY_TURNS * 2);

  return (data ?? [])
    .reverse()
    .map((row) => ({ role: row.role as "user" | "assistant", content: row.content }));
}

/**
 * Renders retrieved chunks for the model.
 *
 * Each is labelled with its own language so the model knows when it is reading
 * across a language boundary, and delimited so that text inside a source cannot
 * be mistaken for part of the instructions.
 */
function renderSources(chunks: RetrievedChunk[]): string {
  return chunks
    .map((chunk, i) => {
      const where = chunk.sourceUrl ? ` — ${chunk.sourceUrl}` : "";
      return [
        `<source id="${i + 1}" lang="${chunk.lang}" title="${chunk.documentTitle}"${where}>`,
        chunk.content,
        `</source>`,
      ].join("\n");
    })
    .join("\n\n");
}

function citationsOf(chunks: RetrievedChunk[]): Citation[] {
  const seen = new Map<string, Citation>();
  for (const chunk of chunks) {
    if (seen.has(chunk.documentId)) continue;
    seen.set(chunk.documentId, {
      documentId: chunk.documentId,
      title: chunk.documentTitle,
      url: chunk.sourceUrl,
      lang: chunk.lang,
    });
  }
  return [...seen.values()];
}

/**
 * The per-turn note appended to the stored system prompt.
 *
 * Kept apart from the prompt itself because it changes every turn — the
 * pronoun stage, whether the placement link has already gone out — while the
 * prompt is stable and, once caching is in play, wants to stay byte-identical.
 */
function turnDirectives(
  lang: Lang,
  faInformal: boolean,
  placementLinkSent: boolean,
  placementUrl: string | null,
  hasSources: boolean,
): string {
  const lines: string[] = [];

  if (lang === "fa") {
    lines.push(
      faInformal
        ? "این اولین جواب نیست: از این به بعد «تو» خطاب کن."
        : "این اولین جواب توست: در همین یک جواب «شما» خطاب کن.",
    );
  }

  if (placementUrl) {
    lines.push(
      placementLinkSent
        ? `The placement assessment link has already been given in this conversation. Do not offer it again unless the person asks for it.`
        : `If — and only if — the person asks which course suits them or how to begin, you may give the placement assessment link once: ${placementUrl}`,
    );
  }

  if (!hasSources) {
    lines.push(
      "No sources matched this question. Say you do not know and point the " +
        "person to Shabnam. Do not answer from general knowledge.",
    );
  }

  return lines.join("\n");
}

export async function* converse(input: ConverseInput): AsyncGenerator<ConverseEvent> {
  const supabase = db();

  const conversation = await loadOrCreateConversation(input);

  // An explicit act — the language toggle, or `/lang` — wins unconditionally.
  // Otherwise the message text decides, under rules that ignore short replies
  // so one Persian word inside an English conversation does not flip it.
  const lang: Lang =
    input.forceLang ?? nextConversationLang(input.text, conversation.lang);

  if (lang !== conversation.lang) {
    await supabase.from("conversations").update({ lang }).eq("id", conversation.id);
  }

  yield { type: "conversation", conversationId: conversation.id, lang };

  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    role: "user",
    content: input.text,
    lang,
  });

  const [retrievalConfig, modelConfig, systemPrompt] = await Promise.all([
    getRetrievalConfig(),
    getModelConfig(input.channel),
    getActivePrompt(lang),
  ]);

  if (!systemPrompt) {
    yield {
      type: "error",
      message: `No active system prompt for "${lang}". Activate one in the panel.`,
    };
    return;
  }

  const { data: placementSetting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "placement_url")
    .maybeSingle();
  const placementUrl = (placementSetting?.value as string) ?? null;

  const result = await search(
    input.text,
    lang,
    retrievalConfig,
    // Query translation is a throwaway call, so it runs on the cheaper of the
    // two configured models rather than on the one answering.
    modelConfig.fallbackModel ?? modelConfig.activeModel,
  );

  yield { type: "sources", citations: citationsOf(result.chunks) };

  // A question nothing answered is the signal that the knowledge base has a
  // hole. With a knowledge base this small that is a routine event, and the
  // loop from here back into `documents` is a first-class feature.
  if (result.chunks.length === 0) {
    await supabase.from("unanswered").insert({
      question: input.text,
      lang,
      conversation_id: conversation.id,
      best_similarity: result.candidates[0]?.similarity ?? null,
    });
  }

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...(await loadHistory(conversation.id)),
    {
      role: "user",
      content: [
        turnDirectives(
          lang,
          conversation.faInformal,
          conversation.placementLinkSent,
          placementUrl,
          result.chunks.length > 0,
        ),
        "",
        "SOURCES",
        result.chunks.length > 0 ? renderSources(result.chunks) : "(none)",
        "",
        "QUESTION",
        input.text,
      ].join("\n"),
    },
  ];

  // The primary model, then the fallback. Only worth retrying for failures the
  // fallback can actually fix — a malformed request fails identically on any
  // model and retrying it just spends twice.
  const attempts = [modelConfig.activeModel, modelConfig.fallbackModel].filter(
    (m): m is string => Boolean(m),
  );

  let answer = "";
  let usage = { tokensIn: 0, tokensOut: 0, costUsd: 0 };
  let usedModel = attempts[0];
  let usedFallback = false;
  let lastError: unknown = null;

  for (const [attempt, model] of attempts.entries()) {
    try {
      answer = "";
      for await (const chunk of stream({
        model,
        messages,
        maxTokens: modelConfig.maxTokens,
        temperature: modelConfig.temperature,
        topP: modelConfig.topP,
      })) {
        if (chunk.type === "delta") {
          answer += chunk.text;
          yield { type: "delta", text: chunk.text };
        } else {
          usage = chunk.usage;
        }
      }
      usedModel = model;
      usedFallback = attempt > 0;
      lastError = null;
      break;
    } catch (error) {
      lastError = error;

      const worthRetrying =
        error instanceof OpenRouterError ? error.shouldFallback : true;
      const isLast = attempt === attempts.length - 1;

      // Once tokens have reached the reader, restarting on another model would
      // replay a different answer over the top of the one they are reading.
      if (answer.length > 0 || !worthRetrying || isLast) break;
    }
  }

  if (lastError && answer.length === 0) {
    yield {
      type: "error",
      message: lastError instanceof Error ? lastError.message : String(lastError),
    };
    return;
  }

  const { data: saved } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      role: "assistant",
      content: answer,
      lang,
      model_used: usedModel,
      tokens_in: usage.tokensIn,
      tokens_out: usage.tokensOut,
      cost: usage.costUsd,
      retrieved_chunk_ids: result.chunks.map((c) => c.id),
    })
    .select("id")
    .single();

  await supabase
    .from("conversations")
    .update({
      last_message_at: new Date().toISOString(),
      // From the second answer on, Persian moves to «تو».
      ...(lang === "fa" && !conversation.faInformal ? { fa_informal: true } : {}),
    })
    .eq("id", conversation.id);

  yield {
    type: "done",
    messageId: saved?.id ?? "",
    model: usedModel,
    usedFallback,
    tokensIn: usage.tokensIn,
    tokensOut: usage.tokensOut,
    costUsd: usage.costUsd,
  };
}
