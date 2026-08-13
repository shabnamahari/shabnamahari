"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin, recordAction } from "@/lib/admin/auth";
import { db } from "@/lib/chatbot/db/client";
import { ingestDocument } from "@/lib/chatbot/core/ingest/ingest";
import type { Lang } from "@/lib/chatbot/core/types";

/**
 * Writing to the knowledge base from the panel.
 *
 * Every one of these re-checks the account. A server action is a public
 * endpoint with a generated name — the form that calls it is behind the layout
 * guard, the action itself is not, and treating the page as the protection
 * would leave a write that anyone who found the name could call.
 *
 * Owners only. `read_only` exists so someone can be shown the panel without
 * being able to change what the bot says.
 */

async function requireOwner() {
  const admin = await requireAdmin();
  if (admin.role !== "owner") throw new Error("Read-only accounts cannot edit.");
  return admin;
}

/** The site's own pages are the crawler's, and it will overwrite them. */
function isEditable(sourceType: string): boolean {
  return sourceType === "text";
}

export type SaveResult = { ok: true; chunks: number } | { ok: false; error: string };

export async function saveDocument(input: {
  id?: string;
  title: string;
  lang: Lang;
  text: string;
}): Promise<SaveResult> {
  const admin = await requireOwner();

  const title = input.title.trim();
  const text = input.text.trim();
  if (!title) return { ok: false, error: "A title is required." };
  if (!text) return { ok: false, error: "There is nothing to save." };

  try {
    let sourceUrl: string | undefined;

    if (input.id) {
      const { data } = await db()
        .from("documents")
        .select("source_url, source_type")
        .eq("id", input.id)
        .maybeSingle();

      if (!data) return { ok: false, error: "That document no longer exists." };
      if (!isEditable(data.source_type)) {
        return {
          ok: false,
          error: "That one comes from the site and is rewritten by the crawler.",
        };
      }
      // Keeping the key is what makes this an edit rather than a second copy:
      // `ingestDocument` finds the row by source_url and replaces it.
      sourceUrl = data.source_url ?? undefined;
    }

    // Written documents get a stable key of their own, so re-saving replaces.
    sourceUrl ??= `panel://kb/${crypto.randomUUID()}`;

    const result = await ingestDocument({
      title,
      text,
      lang: input.lang,
      sourceType: "text",
      sourceUrl,
    });

    await recordAction(
      admin,
      input.id ? "documents.update" : "documents.create",
      result.documentId,
      { title, lang: input.lang, chunks: result.chunks },
    );

    revalidatePath("/admin/knowledge");
    return { ok: true, chunks: result.chunks };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "That did not save.",
    };
  }
}

export async function deleteDocument(id: string): Promise<SaveResult> {
  const admin = await requireOwner();

  const { data } = await db()
    .from("documents")
    .select("title, source_type")
    .eq("id", id)
    .maybeSingle();

  if (!data) return { ok: false, error: "That document no longer exists." };
  if (!isEditable(data.source_type)) {
    return { ok: false, error: "That one comes from the site." };
  }

  // The chunks go with it: `chunks.document_id` cascades on delete.
  const { error } = await db().from("documents").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await recordAction(admin, "documents.delete", id, { title: data.title });
  revalidatePath("/admin/knowledge");
  return { ok: true, chunks: 0 };
}
