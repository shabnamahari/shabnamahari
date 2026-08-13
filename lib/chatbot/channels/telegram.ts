import "server-only";

/**
 * The Telegram Bot API, and the two facts about it that shape this channel.
 *
 * It has no streaming. The web page receives tokens as the model produces them;
 * here a message is sent whole, so a turn that takes a minute is a minute of
 * nothing. The answer is therefore posted early and edited as it grows, which
 * is the closest Telegram gets to watching someone type.
 *
 * And it rate-limits edits — roughly one a second to the same chat, and a burst
 * spends the allowance on frames nobody reads. `EDIT_INTERVAL_MS` is the pace,
 * chosen under it rather than at it.
 */

const API = "https://api.telegram.org/bot";

export const EDIT_INTERVAL_MS = 1400;

function token(): string {
  const value = process.env.TELEGRAM_BOT_TOKEN;
  if (!value) throw new Error("TELEGRAM_BOT_TOKEN is not set.");
  return value;
}

async function call<T>(method: string, body: unknown): Promise<T | null> {
  const res = await fetch(`${API}${token()}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await res.json().catch(() => null)) as
    | { ok: boolean; result?: T; description?: string }
    | null;

  if (!payload?.ok) {
    // Never thrown. A failed edit is a cosmetic loss in the middle of an answer
    // that is otherwise fine, and letting it take the turn down would trade a
    // stutter for silence.
    console.warn(`[telegram] ${method} failed:`, payload?.description ?? res.status);
    return null;
  }

  return payload.result ?? null;
}

export async function sendMessage(
  chatId: number,
  text: string,
  extra: Record<string, unknown> = {},
): Promise<number | null> {
  const result = await call<{ message_id: number }>("sendMessage", {
    chat_id: chatId,
    text,
    // No parse_mode on purpose. Markdown here is a footgun: an unmatched
    // asterisk or underscore in an answer makes Telegram reject the whole
    // message, and the assistant writes prose it did not escape.
    link_preview_options: { is_disabled: true },
    ...extra,
  });
  return result?.message_id ?? null;
}

export async function editMessage(
  chatId: number,
  messageId: number,
  text: string,
): Promise<void> {
  await call("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    link_preview_options: { is_disabled: true },
  });
}

/** The "typing…" line. Expires by itself after a few seconds. */
export async function sendTyping(chatId: number): Promise<void> {
  await call("sendChatAction", { chat_id: chatId, action: "typing" });
}
