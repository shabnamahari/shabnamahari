"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin, recordAction } from "@/lib/admin/auth";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/admin/leads";
import { db } from "@/lib/chatbot/db/client";

/**
 * The only two things a human adds to a lead.
 *
 * Everything else on the row was said by the person themselves and is left
 * exactly as the bot recorded it — a contact detail rewritten by hand is a
 * contact detail nobody can prove. What follow-up needs on top of that is where
 * this person got to, and whatever was learned by actually speaking to them.
 */

// The statuses themselves are in `lib/admin/leads.ts`, not here. A `"use
// server"` module exports server references rather than values, so a constant
// declared beside these actions is unreadable from the browser that needs it.
export type LeadResult = { ok: true } | { ok: false; error: string };

async function requireOwner() {
  const admin = await requireAdmin();
  if (admin.role !== "owner") throw new Error("Read-only accounts cannot edit.");
  return admin;
}

export async function updateLead(input: {
  id: string;
  status: LeadStatus;
  notes: string;
}): Promise<LeadResult> {
  const admin = await requireOwner();

  if (!LEAD_STATUSES.includes(input.status)) {
    return { ok: false, error: "That is not a status." };
  }

  const notes = input.notes.trim();

  const { error } = await db()
    .from("leads")
    .update({
      status: input.status,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };

  await recordAction(admin, "leads.update", input.id, { status: input.status });

  revalidatePath("/admin/leads");
  return { ok: true };
}

/**
 * Clearing the launch-notice flag.
 *
 * Separate from the status because it is a promise rather than a stage: the bot
 * told this person they would hear when the material is published. It comes off
 * the list when they have actually been told, and only then — which is why it
 * is its own press and not a side effect of moving someone to "contacted".
 */
export async function markNotified(id: string): Promise<LeadResult> {
  const admin = await requireOwner();

  const { error } = await db()
    .from("leads")
    .update({ notify_on_launch: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  await recordAction(admin, "leads.notified", id);

  revalidatePath("/admin/leads");
  return { ok: true };
}
