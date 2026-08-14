import "server-only";

import { db } from "@/lib/chatbot/db/client";
import { getActivePrompt, getModelConfig, getRetrievalConfig } from "./config";
import { OpenRouterError, stream, type ChatMessage } from "./generate/openrouter";
import { nextConversationLang } from "./ingest/lang";
import { search } from "./retrieve/search";
import { runTool, toolDefinitions } from "./tools";
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
): Promise<{
  id: string;
  lang: Lang;
  faInformal: boolean;
  placementLinkSent: boolean;
  humanActive: boolean;
}> {
  const supabase = db();

  if (input.conversationId) {
    const { data, error } = await supabase
      .from("conversations")
      .select("id, lang, fa_informal, placement_link_sent_at, status")
      .eq("id", input.conversationId)
      .single();
    if (error || !data) throw new Error(`unknown conversation: ${input.conversationId}`);
    return {
      id: data.id,
      lang: data.lang,
      faInformal: data.fa_informal,
      placementLinkSent: Boolean(data.placement_link_sent_at),
      humanActive: data.status === "human_active",
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
  return {
    id: data.id,
    lang: data.lang,
    faInformal: false,
    placementLinkSent: false,
    humanActive: false,
  };
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
  contentComingSoon: boolean,
  latinAllowlist: string[],
  contactChannels: { label: string; value: string }[],
  handoffNote: string,
  pricePolicy: string,
  bannedWords: string[],
): string {
  const lines: string[] = [];

  if (lang === "fa") {
    lines.push(
      faInformal
        ? "این اولین جواب نیست: از این به بعد «تو» خطاب کن."
        : "این اولین جواب توست: در همین یک جواب «شما» خطاب کن.",
    );

    // The prompt bans Latin script in Persian answers. These are the terms that
    // survive it — kept in the database rather than in the prompt because the
    // list grows, and because the eval suite reads the same row as its
    // allow-list, so the check can never drift from the instruction.
    // Written as a spelling rule and marked as one. Joined with « · » and
    // introduced as a bare list, the model read it as content and reproduced it
    // whole: it once told someone the assessment measures
    // «Reading · Listening · Speaking · Writing · Sir Cue» — its own name
    // offered as a fifth IELTS skill — and signed the answer off with the
    // tagline, which is on the list for the same reason.
    if (latinAllowlist.length > 0) {
      lines.push(
        `قاعده‌ی املا، نه محتوا. اگر — و فقط اگر — در جوابت به یکی از این‌ها ` +
          `اشاره کردی، لاتین بنویسش، چون معادل فارسیِ جاافتاده ندارد: ` +
          latinAllowlist.map((t) => `«${t}»`).join("، ") +
          `\nخودِ این فهرست را نقل نکن، از آن فهرستی نساز، و هیچ‌کدام را جایی ` +
          `که موضوع جواب نیست نیاور.`,
      );
    }
  }

  // Sent with every question rather than written into the prompt, so that
  // changing the list is one settings edit rather than a new prompt version in
  // each language — and so the eval suite can read the same row it is checking
  // against.
  if (bannedWords.length > 0) {
    lines.push(`Never write any of these words: ${bannedWords.join(" · ")}`);
  }

  // Injected every turn rather than retrieved, because the turn where the bot
  // needs this is the turn where retrieval found nothing. Without it the model
  // fills the gap: in testing it printed a bracketed placeholder to the reader
  // in English, and invented an Instagram account in Persian.
  if (contactChannels.length > 0) {
    lines.push(
      `Ways to reach Shabnam — these and no others, and never invent one: ` +
        contactChannels.map((c) => `${c.label} ${c.value}`).join(" · ") +
        (handoffNote ? `\nWhen you hand someone over, say: ${handoffNote}` : ""),
    );
  }

  if (pricePolicy === "refer") {
    lines.push(
      "Prices are not settled yet and are never stated in chat. If someone asks " +
        "what something costs, say the price is not published and that Shabnam " +
        "gives it directly, then point them at her.",
    );
  }

  if (placementUrl) {
    lines.push(
      placementLinkSent
        ? `The placement assessment link has already been given in this conversation. Do not offer it again unless the person asks for it.`
        : `If — and only if — the person asks which course suits them or how to begin, ` +
            `you may give the placement assessment link once. Write it exactly as ` +
            `it appears here, character for character, and never put a domain in ` +
            `front of it: ${placementUrl}`,
    );
  }

  // Deliberately not conditioned on whether the search returned anything.
  // Retrieval regularly returns a passage that is merely the closest thing to
  // the question rather than an answer to it — the model sees that and says it
  // does not know, correctly, while a "did we get chunks?" test says we did.
  // Whether the sources answer the question is a judgement only the model is
  // positioned to make, so it is told what to do in either case and left to
  // decide which case it is in.
  if (contentComingSoon) {
    lines.push(
      "The course material is not published on the site yet, so much of what " +
        "people ask about is genuinely not there. If the sources below do not " +
        "answer the question, say so plainly, and say that a lot more is being " +
        "added to the site soon. Then offer — once, and as something they can " +
        "decline — to take their name and phone number so you can tell them " +
        "when it is up. If they give you either, call capture_lead with " +
        "notify_on_launch set to true. Never answer the question itself from " +
        "general knowledge, and never invent a way to contact Shabnam.",
    );
  } else if (!hasSources) {
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

  // Shabnam has taken this conversation over from the queue, so the bot says
  // nothing at all. The message above is still recorded — it is what she will
  // read — but there is no answer, no retrieval and no model call.
  //
  // Silence rather than "a human will reply shortly": she is already in this
  // conversation, and a bot interjecting to announce her is both noise and a
  // promise about timing that nobody asked it to make. It answers again the
  // moment she gives the conversation back.
  if (conversation.humanActive) {
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversation.id);
    return;
  }

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

  const { data: settingRows } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", [
      "placement_url",
      "content_coming_soon",
      "fa_latin_allowlist",
      "contact_channels",
      "contact_handoff_note",
      "price_policy",
      "banned_words",
    ]);

  const settings = new Map((settingRows ?? []).map((row) => [row.key, row.value]));
  const placementUrl = (settings.get("placement_url") as string) ?? null;
  const contentComingSoon = settings.get("content_coming_soon") === true;
  const latinAllowlist = (settings.get("fa_latin_allowlist") as string[]) ?? [];
  const contactChannels =
    (settings.get("contact_channels") as { label: string; value: string }[]) ?? [];
  const handoffNote =
    (settings.get("contact_handoff_note") as Record<Lang, string>)?.[lang] ?? "";
  const pricePolicy = (settings.get("price_policy") as string) ?? "refer";
  const bannedWords =
    (settings.get("banned_words") as Record<Lang, string[]>)?.[lang] ?? [];

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
          contentComingSoon,
          latinAllowlist,
          contactChannels,
          handoffNote,
          pricePolicy,
          bannedWords,
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

  // The primary model, the fallback, and then whatever costs nothing.
  //
  // The third one is not redundancy for its own sake. Section 09 asks for a
  // switch to a cheaper model rather than silence when money runs out, and that
  // was written for the budget cap — but running out of credit at the provider
  // produces the same situation and used to produce silence instead. An eval
  // run emptied the account and every answer became an error: both paid models
  // returned 402, in a system that had a free model configured for exactly this
  // and never reached for it.
  const { data: budget } = await supabase
    .from("budget_config")
    .select("over_cap_model")
    .maybeSingle();

  const attempts = [
    modelConfig.activeModel,
    modelConfig.fallbackModel,
    budget?.over_cap_model ?? null,
  ].filter((m): m is string => Boolean(m));

  let answer = "";
  let usage = { tokensIn: 0, tokensOut: 0, costUsd: 0 };
  let usedModel = attempts[0];
  let usedFallback = false;
  let lastError: unknown = null;

  const toolContext = {
    conversationId: conversation.id,
    channel: input.channel,
    lang,
  };

  for (const [attempt, model] of attempts.entries()) {
    try {
      answer = "";
      const turn = [...messages];

      // A tool call is not the end of the turn: the model records what it was
      // told, then carries on speaking. Each pass either produces the answer or
      // produces calls to run and feed back. The cap is a stop for a model that
      // loops on a tool rather than a real limit on useful work.
      const MAX_TOOL_ROUNDS = 4;

      for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
        let roundText = "";
        let calls: { id: string; name: string; arguments: string }[] = [];

        for await (const chunk of stream({
          model,
          messages: turn,
          maxTokens: modelConfig.maxTokens,
          temperature: modelConfig.temperature,
          topP: modelConfig.topP,
          tools: toolDefinitions(),
        })) {
          if (chunk.type === "delta") {
            // A round that follows a tool call starts a fresh sentence, and
            // without this it is welded onto the last one: "…so Shabnam can
            // reach you.Done."
            if (roundText === "" && answer !== "" && !/\s$/.test(answer)) {
              answer += " ";
              yield { type: "delta", text: " " };
            }
            roundText += chunk.text;
            answer += chunk.text;
            yield { type: "delta", text: chunk.text };
          } else if (chunk.type === "tool_calls") {
            calls = chunk.calls;
          } else {
            // Usage accumulates across rounds — a turn that called a tool cost
            // two model calls, and billing one of them would understate it.
            usage = {
              tokensIn: usage.tokensIn + chunk.usage.tokensIn,
              tokensOut: usage.tokensOut + chunk.usage.tokensOut,
              costUsd: usage.costUsd + chunk.usage.costUsd,
            };
          }
        }

        if (calls.length === 0) break;

        turn.push({ role: "assistant", content: roundText, tool_calls: calls });
        for (const call of calls) {
          const result = await runTool(call.name, call.arguments, toolContext);
          yield {
            type: "tool",
            name: call.name,
            arguments: call.arguments,
            result,
          };
          turn.push({ role: "tool", tool_call_id: call.id, content: result });
        }
      }

      // A model that returns nothing at all is a failure, even though nothing
      // threw. It happened once on a free model — no text, no tool call, no
      // error — and the reader simply saw an empty reply. Silence is the one
      // outcome the fallback chain exists to prevent, so it counts as a failure
      // and the next model gets a turn.
      if (answer.trim() === "") {
        lastError = new Error(`${model} returned an empty response`);
        if (attempt < attempts.length - 1) continue;
        break;
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
      // The column was read on every turn and written on none, so the bot was
      // told it had not yet given the link no matter how many times it had, and
      // it offered it again on the next question. Recorded from the answer
      // itself rather than from the intent to offer it, because the directive
      // permits the link and the model decides.
      ...(placementUrl && !conversation.placementLinkSent && answer.includes(placementUrl)
        ? { placement_link_sent_at: new Date().toISOString() }
        : {}),
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
