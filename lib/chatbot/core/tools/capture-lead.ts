import "server-only";

import { db } from "@/lib/chatbot/db/client";
import type { Tool } from "./index";

/**
 * Records what someone has told the bot about themselves.
 *
 * Three of the fields are the point of every conversation — target band, exam
 * date, and whether they have taken the placement assessment. The fourth,
 * `notify_on_launch`, covers the case that exists right now: the course
 * material is not published yet, so someone who asks about it is offered a
 * message when it is.
 *
 * One row per conversation, filled in over several turns rather than demanded
 * up front. Somebody who gives their exam date early and their name later ends
 * up as one lead, not two half-empty ones.
 */
export const captureLead: Tool = {
  definition: {
    name: "capture_lead",
    description:
      "Record details the person has given you about themselves. Call this as " +
      "soon as they tell you any of these things — do not wait until you have " +
      "all of them, and do not ask for them all at once. Call it again later " +
      "to add what you learn. Only record what they actually said; never guess " +
      "or infer a value.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Their name, if they gave it.",
        },
        contact: {
          type: "string",
          description:
            "However they want to be reached, exactly as they wrote it — a " +
            "phone number, an email address, a Telegram handle.",
        },
        target_band: {
          type: "number",
          description: "The IELTS band they need, e.g. 6.5 or 7.",
        },
        exam_date: {
          type: "string",
          description: "Their exam date as YYYY-MM-DD, if they gave a date.",
        },
        taken_before: {
          type: "boolean",
          description: "Whether they have sat IELTS before. Only if they said.",
        },
        placement_status: {
          type: "string",
          enum: ["not_taken", "taken"],
          description:
            "Whether they have done the placement assessment. Leave this out " +
            "unless they said so plainly.",
        },
        notify_on_launch: {
          type: "boolean",
          description:
            "True when they asked to be told once the course material is " +
            "published. Requires a contact — do not set this on its own.",
        },
      },
      required: [],
      additionalProperties: false,
    },
  },

  async run(args, context) {
    const supabase = db();

    const patch: Record<string, unknown> = {};
    if (typeof args.name === "string" && args.name.trim()) patch.name = args.name.trim();
    if (typeof args.contact === "string" && args.contact.trim()) {
      patch.contact = args.contact.trim();
    }
    if (typeof args.target_band === "number") patch.target_band = args.target_band;
    if (typeof args.taken_before === "boolean") patch.taken_before = args.taken_before;
    if (args.placement_status === "taken" || args.placement_status === "not_taken") {
      patch.placement_status = args.placement_status;
    }

    // Rejected rather than coerced. A malformed date silently stored as null
    // looks identical to "they did not say", and this is the field the whole
    // follow-up is scheduled against.
    if (typeof args.exam_date === "string" && args.exam_date.trim()) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(args.exam_date.trim())) {
        return `"${args.exam_date}" is not a date I can store. Ask for it as year, month and day.`;
      }
      patch.exam_date = args.exam_date.trim();
    }

    // A notification flag without anywhere to send the notification is not a
    // record, it is a false promise — the panel would show someone waiting who
    // can never be reached.
    if (args.notify_on_launch === true) {
      const contact = patch.contact ?? (await existingContact(context.conversationId));
      if (!contact) {
        return "I cannot record that without a way to reach them. Ask for a phone number or an email first.";
      }
      patch.notify_on_launch = true;
    }

    if (Object.keys(patch).length === 0) {
      return "Nothing to record — no details were given.";
    }

    const { data: existing } = await supabase
      .from("leads")
      .select("id")
      .eq("conversation_id", context.conversationId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("leads")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("leads").insert({
        ...patch,
        source: context.channel,
        conversation_id: context.conversationId,
      });
      if (error) throw new Error(error.message);
    }

    return `Recorded: ${Object.keys(patch).join(", ")}.`;
  },
};

async function existingContact(conversationId: string): Promise<string | null> {
  const { data } = await db()
    .from("leads")
    .select("contact")
    .eq("conversation_id", conversationId)
    .maybeSingle();
  return data?.contact ?? null;
}
