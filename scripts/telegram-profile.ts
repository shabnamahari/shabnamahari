import "./load-env";

import { TG_PROFILE } from "@/lib/chatbot/channels/telegram-copy";

/**
 * Writes the bot's public profile to Telegram from `TG_PROFILE`.
 *
 * Everything a stranger sees before they have said a word — the name, the line
 * above the START button, the profile text, and the command menu — lives on
 * Telegram's servers rather than in this repository. It had been set by hand,
 * once, which meant it existed nowhere anybody could read it, could drift from
 * the site without anything noticing, and would come back blank on a new token
 * with nobody knowing what it used to say.
 *
 * Two passes: the default, and Persian. Telegram serves the `fa` entry to
 * anyone whose app is set to Persian and the default to everyone else, which is
 * why the default carries both languages — plenty of the people this bot is for
 * run Telegram in English.
 *
 * Safe to run repeatedly; every call is a write of the current value.
 *
 *   npm run tg:profile
 */

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is not set. Nothing was changed.");
  process.exit(1);
}

async function call(method: string, body: Record<string, unknown>): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await res.json()) as { ok: boolean; description?: string };
  if (!payload.ok) {
    // Thrown rather than logged. A half-written profile is worse than an
    // unchanged one, because the parts that did land look deliberate.
    throw new Error(`${method}: ${payload.description ?? res.status}`);
  }
  console.log(`  ✓ ${method}`);
}

async function main() {
  console.log("Setting the bot's public profile\n");

  console.log("default (everyone whose app is not in Persian)");
  await call("setMyName", { name: TG_PROFILE.name });
  await call("setMyShortDescription", {
    short_description: TG_PROFILE.en.short,
  });
  await call("setMyDescription", { description: TG_PROFILE.en.description });
  await call("setMyCommands", { commands: TG_PROFILE.en.commands });

  console.log("\nfa");
  await call("setMyShortDescription", {
    language_code: "fa",
    short_description: TG_PROFILE.fa.short,
  });
  await call("setMyDescription", {
    language_code: "fa",
    description: TG_PROFILE.fa.description,
  });
  await call("setMyCommands", {
    language_code: "fa",
    commands: TG_PROFILE.fa.commands,
  });

  // Read back rather than trust the writes. Telegram accepts a value and then
  // serves it from a cache, and the only claim worth making here is what it
  // actually returns.
  console.log("\nAs Telegram now reports it:\n");
  for (const code of ["", "fa"]) {
    const label = code || "default";
    const q = code ? `?language_code=${code}` : "";
    const short = await read(`getMyShortDescription${q}`, "short_description");
    const commands = (await read(`getMyCommands${q}`, "commands")) as
      | { command: string; description: string }[]
      | undefined;

    console.log(`  [${label}] ${short || "(empty)"}`);
    console.log(
      `  [${label}] ${
        commands?.length
          ? commands.map((c) => `/${c.command} — ${c.description}`).join("  ·  ")
          : "(no commands — Telegram will fall back to the default list)"
      }\n`,
    );
  }
}

/**
 * One field back out of Telegram.
 *
 * `getMyCommands` answers with the array itself where the description methods
 * answer with an object wrapping it, so the shape is checked rather than
 * assumed. Assuming it cost this script its first run: the writes had all
 * succeeded and the verification crashed, which reads exactly like a failure.
 */
async function read(path: string, key: string): Promise<unknown> {
  const res = await fetch(`https://api.telegram.org/bot${token}/${path}`);
  const payload = (await res.json()) as { ok: boolean; result?: unknown };
  const result = payload.result;

  if (Array.isArray(result)) return result;
  if (result && typeof result === "object") {
    return (result as Record<string, unknown>)[key];
  }
  return undefined;
}

main().catch((error) => {
  console.error("\n" + (error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
