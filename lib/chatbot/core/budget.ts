import "server-only";

import { sendMessage } from "@/lib/chatbot/channels/telegram";
import { ownerChatId } from "@/lib/chatbot/channels/relay";
import { db } from "@/lib/chatbot/db/client";

/**
 * What the month has cost, and what to do about it.
 *
 * `monthly_cap_usd` has been 50 since phase 1 and was never once compared
 * against anything. `converse` read `over_cap_model` out of the same row, so
 * the fallback existed with nothing able to trigger it — the spend was being
 * recorded on every message and never added up.
 *
 * Reaching the cap does not stop the assistant. Section 09 asks for a cheaper
 * model rather than silence, and that is the right call for a brand whose bot
 * is the front door: a month that costs more than expected should degrade, not
 * close.
 */

export type Budget = {
  capUsd: number;
  spentUsd: number;
  /** The model to use instead, once the cap is reached. Null if none is set. */
  overCapModel: string | null;
  /** True when spend has reached the cap and a cheaper model should answer. */
  overCap: boolean;
};

export async function readBudget(): Promise<Budget | null> {
  const supabase = db();

  const [{ data: config }, { data: spent }] = await Promise.all([
    supabase
      .from("budget_config")
      .select("monthly_cap_usd, warn_at, over_cap_model, capped_since")
      .maybeSingle(),
    supabase.rpc("month_spend_usd"),
  ]);

  if (!config) return null;

  const capUsd = Number(config.monthly_cap_usd);
  const spentUsd = Number(spent ?? 0);
  const overCap = capUsd > 0 && spentUsd >= capUsd;

  // Told, once, at the threshold — and once again when the cap itself is
  // reached. `capped_since` is what makes it once: without a mark the check
  // runs on every turn and the warning becomes the thing she stops reading.
  await announce(config, capUsd, spentUsd, overCap);

  return {
    capUsd,
    spentUsd,
    overCapModel: config.over_cap_model ?? null,
    overCap,
  };
}

async function announce(
  config: { warn_at: number | string; capped_since: string | null },
  capUsd: number,
  spentUsd: number,
  overCap: boolean,
): Promise<void> {
  if (capUsd <= 0) return;

  const warnAt = Number(config.warn_at) || 0.8;
  const alreadyMarked = Boolean(config.capped_since);

  if (overCap && !alreadyMarked) {
    await db()
      .from("budget_config")
      .update({ capped_since: new Date().toISOString() })
      .is("capped_since", null);
    await tell(
      `The $${capUsd.toFixed(0)} monthly cap is reached — $${spentUsd.toFixed(2)} so far.\n\n` +
        `Sir Cue keeps answering on the free model, which is slower and less careful. ` +
        `Raise the cap in the panel to put it back.`,
    );
    return;
  }

  // The month rolled over, or the cap was raised. Clear the mark so the next
  // crossing is announced rather than swallowed.
  if (!overCap && alreadyMarked) {
    await db()
      .from("budget_config")
      .update({ capped_since: null })
      .not("capped_since", "is", null);
    return;
  }

  if (!overCap && spentUsd >= capUsd * warnAt && !alreadyMarked) {
    // Deliberately not marked, so this can fire again next month. It is cheap:
    // one message per turn only in the narrow band between the threshold and
    // the cap, and that band is measured in a few dollars.
    await tellOncePerDay(
      `$${spentUsd.toFixed(2)} of the $${capUsd.toFixed(0)} monthly cap is spent.`,
    );
  }
}

/** Best effort. A budget warning that fails must not fail the answer. */
async function tell(text: string): Promise<void> {
  try {
    const chat = await ownerChatId();
    if (chat) await sendMessage(chat, text);
  } catch {
    // Nothing to do about it here, and nothing worth taking a turn down for.
  }
}

/**
 * The eighty-percent warning, at most once a day.
 *
 * Reuses the rate limiter rather than adding a column: "has this been said
 * today" and "has this been asked too often" are the same question, and the
 * table already answers it atomically.
 */
async function tellOncePerDay(text: string): Promise<void> {
  const { data } = await db().rpc("check_rate_limit", {
    p_bucket: "budget:warn",
    p_window_seconds: 86_400,
    p_limit: 1,
  });
  if (data === false) return;
  await tell(text);
}
