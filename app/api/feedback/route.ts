import { NextResponse } from "next/server";

import { db } from "@/lib/chatbot/db/client";

/**
 * Somebody saying an answer was wrong.
 *
 * Only the down. There is no thumbs-up here and there is no rating to send:
 * the panel acts on the list of bad answers and would do nothing differently
 * with a good one, which is what `0004` decided when it made this a two-value
 * column rather than five stars. Sending `-1` from the client would be a
 * parameter with one legal value.
 *
 * The comment is optional and arrives separately, because the useful thing —
 * that this answer was wrong — is already recorded by the time anyone decides
 * whether to explain why. Making the explanation a condition of the report
 * loses most of the reports.
 */

export const dynamic = "force-dynamic";

const MAX_COMMENT = 500;

export async function POST(request: Request): Promise<Response> {
  let body: { messageId?: unknown; comment?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const messageId = typeof body.messageId === "string" ? body.messageId : "";
  if (!/^[0-9a-f-]{36}$/i.test(messageId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const comment =
    typeof body.comment === "string" && body.comment.trim()
      ? body.comment.trim().slice(0, MAX_COMMENT)
      : null;

  const supabase = db();

  // The message has to exist and has to be one of ours. Without this the
  // endpoint takes any UUID and fills the table with rows pointing nowhere —
  // and the foreign key would reject them one at a time with a 500 rather than
  // a refusal that says what happened.
  const { data: message } = await supabase
    .from("messages")
    .select("id, role")
    .eq("id", messageId)
    .maybeSingle();

  if (!message || message.role !== "assistant") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  // One row per message, enforced by a unique index. Pressing again, or adding
  // the comment after the fact, updates the row it already has rather than
  // failing — the second press is the same person saying the same thing.
  const { error } = await supabase
    .from("feedback")
    .upsert({ message_id: messageId, rating: -1, comment }, { onConflict: "message_id" });

  if (error) return NextResponse.json({ ok: false }, { status: 500 });

  return NextResponse.json({ ok: true });
}
