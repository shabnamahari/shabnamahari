"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin, recordAction } from "@/lib/admin/auth";
import { db } from "@/lib/chatbot/db/client";

/**
 * Taking a conversation over, and handing it back.
 *
 * These two are the whole point of the queue. Claiming does not merely mark a
 * row — it sets the conversation to `human_active`, which is what stops the bot
 * answering. Without that, Shabnam and Sir Cue would both reply to the same
 * message, and the person would be talking to two of you.
 */

async function requireOwner() {
  const admin = await requireAdmin();
  if (admin.role !== "owner") throw new Error("Read-only accounts cannot edit.");
  return admin;
}

export type QueueResult = { ok: true } | { ok: false; error: string };

export async function claimHandoff(input: {
  id: string;
  conversationId: string;
}): Promise<QueueResult> {
  const admin = await requireOwner();
  const now = new Date().toISOString();

  const { error } = await db()
    .from("handoffs")
    .update({ claimed_at: now })
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };

  // The bot goes quiet here, not when the row was written. Between the handoff
  // and this press it should keep answering: she may be hours away, and silence
  // in the meantime is worse than an imperfect answer.
  const { error: conversation } = await db()
    .from("conversations")
    .update({ status: "human_active" })
    .eq("id", input.conversationId);
  if (conversation) return { ok: false, error: conversation.message };

  await recordAction(admin, "handoffs.claim", input.id, {
    conversationId: input.conversationId,
  });

  revalidatePath("/admin/queue");
  revalidatePath(`/admin/conversations/${input.conversationId}`);
  return { ok: true };
}

export async function releaseHandoff(input: {
  id: string;
  conversationId: string;
}): Promise<QueueResult> {
  const admin = await requireOwner();

  const { error } = await db()
    .from("handoffs")
    .update({ released_at: new Date().toISOString() })
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };

  const { error: conversation } = await db()
    .from("conversations")
    .update({ status: "open" })
    .eq("id", input.conversationId);
  if (conversation) return { ok: false, error: conversation.message };

  await recordAction(admin, "handoffs.release", input.id, {
    conversationId: input.conversationId,
  });

  revalidatePath("/admin/queue");
  revalidatePath(`/admin/conversations/${input.conversationId}`);
  return { ok: true };
}
