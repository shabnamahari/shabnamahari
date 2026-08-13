"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin, recordAction } from "@/lib/admin/auth";
import { db } from "@/lib/chatbot/db/client";
import type { Lang } from "@/lib/chatbot/core/types";

/**
 * Changing what Sir Cue is told to be.
 *
 * Nothing here edits a prompt in place. A save writes the next version and
 * makes it active, which means every wording the bot has ever run under is
 * still on the shelf and any of them can be put back in one press. That is the
 * whole safety story for this screen: the blast radius of a bad edit is one
 * click, not a redeploy.
 *
 * The database allows exactly one active prompt per language and enforces it
 * with a partial unique index, so activation deactivates first and activates
 * second. The other order collides with the index and fails — correctly, but
 * after having already turned the running prompt off.
 */

async function requireOwner() {
  const admin = await requireAdmin();
  if (admin.role !== "owner") throw new Error("Read-only accounts cannot edit.");
  return admin;
}

export type PromptResult = { ok: true; version: number } | { ok: false; error: string };

async function activate(lang: Lang, id: string): Promise<string | null> {
  const { error: off } = await db()
    .from("prompt_versions")
    .update({ is_active: false })
    .eq("lang", lang)
    .eq("is_active", true);
  if (off) return off.message;

  const { error: on } = await db()
    .from("prompt_versions")
    .update({ is_active: true })
    .eq("id", id);
  return on?.message ?? null;
}

export async function savePrompt(input: {
  lang: Lang;
  content: string;
  note: string;
}): Promise<PromptResult> {
  const admin = await requireOwner();

  const content = input.content.trim();
  if (!content) return { ok: false, error: "A prompt cannot be empty." };

  const note = input.note.trim();
  if (!note) {
    // Required, not optional. A version list with no notes is a list of
    // numbers, and the one time it matters is the one time nobody remembers
    // which number was the good one.
    return { ok: false, error: "Say in a few words what changed." };
  }

  const { data: latest } = await db()
    .from("prompt_versions")
    .select("version")
    .eq("lang", input.lang)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = (latest?.version ?? 0) + 1;

  const { data: created, error } = await db()
    .from("prompt_versions")
    .insert({ lang: input.lang, content, note, version, is_active: false })
    .select("id")
    .single();

  if (error || !created) {
    return { ok: false, error: error?.message ?? "That did not save." };
  }

  const failed = await activate(input.lang, created.id);
  if (failed) return { ok: false, error: failed };

  await recordAction(admin, "prompt_versions.create", created.id, {
    lang: input.lang,
    version,
    note,
  });

  revalidatePath("/admin/prompt");
  return { ok: true, version };
}

export async function restorePrompt(input: {
  lang: Lang;
  id: string;
  version: number;
}): Promise<PromptResult> {
  const admin = await requireOwner();

  const failed = await activate(input.lang, input.id);
  if (failed) return { ok: false, error: failed };

  await recordAction(admin, "prompt_versions.activate", input.id, {
    lang: input.lang,
    version: input.version,
  });

  revalidatePath("/admin/prompt");
  return { ok: true, version: input.version };
}
