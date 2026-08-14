import "./load-env";

import { db } from "@/lib/chatbot/db/client";

/**
 * Empties everything the bot has collected from talking to people.
 *
 * Conversations, messages, leads, intake answers, unanswered questions,
 * feedback, handoffs, and the people records behind them. Nothing else: the
 * knowledge base, the prompts, the settings and the admin accounts are what the
 * bot *is*, not what it heard, and this does not touch them.
 *
 * It exists because everything in there right now is ours. Every lead is a test
 * Shabnam or I typed, every handoff is one I triggered to prove the queue
 * works, and a panel whose numbers are all fictional is a panel nobody can read
 * a real one from. Better to start the count at zero than to spend a month
 * subtracting.
 *
 * There will be a second time — a bad afternoon of testing, a broken prompt
 * that produced fifty nonsense conversations — so this is a script rather than
 * something done by hand once and forgotten.
 *
 *   npm run db:clear-conversations -- --yes
 *
 * Without --yes it counts what it would remove and stops. This deletes real
 * rows and there is no undo, so the default is to show you the bill.
 */

const TABLES = [
  // Order matters, and not in the obvious way. `messages`, `feedback` and
  // `handoffs` cascade from `conversations`, so deleting a conversation takes
  // them with it. But `leads`, `intake_log` and `unanswered` are declared
  // `on delete set null` — deliberately, because a lead has to outlive the
  // conversation that produced it — so removing conversations first would strand
  // them with nothing left to identify them by. They go first, while they can
  // still be found.
  "leads",
  "intake_log",
  "unanswered",
  "feedback",
  "handoffs",
  "messages",
  "conversations",
  "unified_users",
] as const;

async function count(table: string): Promise<number> {
  const { count: rows } = await db()
    .from(table)
    .select("id", { count: "exact", head: true });
  return rows ?? 0;
}

async function main() {
  const confirmed = process.argv.includes("--yes");
  const before = new Map<string, number>();

  for (const table of TABLES) before.set(table, await count(table));
  const total = [...before.values()].reduce((sum, n) => sum + n, 0);

  console.log(confirmed ? "Clearing:\n" : "Would clear:\n");
  for (const table of TABLES) {
    console.log(`  ${table.padEnd(16)} ${before.get(table)}`);
  }
  console.log(`\n  ${"total".padEnd(16)} ${total}`);

  if (total === 0) {
    console.log("\nAlready empty.");
    return;
  }

  if (!confirmed) {
    console.log("\nNothing was deleted. Run again with --yes to do it.");
    return;
  }

  for (const table of TABLES) {
    // `neq` on a column that is never null is how PostgREST is told "every
    // row" — it refuses an unfiltered delete, which is a good refusal.
    const { error } = await db()
      .from(table)
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw new Error(`${table}: ${error.message}`);
  }

  // Counted again rather than assumed. A delete that silently matched nothing
  // and a delete that worked look identical from the return value.
  console.log("\nAfter:\n");
  let left = 0;
  for (const table of TABLES) {
    const rows = await count(table);
    left += rows;
    console.log(`  ${table.padEnd(16)} ${rows}`);
  }

  console.log(
    left === 0
      ? "\nEmpty. The knowledge base, prompts, settings and admin accounts are untouched."
      : `\n${left} row(s) still there — something refused to go.`,
  );
}

main().catch((error) => {
  console.error("\n" + (error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
