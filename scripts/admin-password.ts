/**
 * Creates the owner account, or sets its password.
 *
 *   npm run admin:password
 *
 * Interactive on purpose. The password is typed here and hashed here; it is
 * never an argument, so it does not reach the shell history, and never a
 * message, so it does not reach a chat log. What goes to the database is the
 * scrypt hash.
 */

import "./load-env";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { db } from "@/lib/chatbot/db/client";
import { hashPassword } from "@/lib/admin/session";

/** Reads a line without echoing it, so the password is not left on screen. */
async function secret(prompt: string): Promise<string> {
  stdout.write(prompt);
  const wasRaw = stdin.isTTY ? stdin.isRaw : false;
  if (stdin.isTTY) stdin.setRawMode(true);

  return new Promise((resolve) => {
    let value = "";
    const onData = (chunk: Buffer) => {
      const char = chunk.toString();
      if (char === "\n" || char === "\r" || char === "") {
        if (stdin.isTTY) stdin.setRawMode(wasRaw);
        stdin.removeListener("data", onData);
        stdout.write("\n");
        resolve(value);
        return;
      }
      if (char === "") process.exit(1); // ctrl-c
      if (char === "") {
        value = value.slice(0, -1);
        return;
      }
      value += char;
    };
    stdin.on("data", onData);
    stdin.resume();
  });
}

async function main() {
  const rl = createInterface({ input: stdin, output: stdout });

  const fallback = process.env.ADMIN_OWNER_EMAIL ?? "";
  const email =
    (await rl.question(`Email${fallback ? ` [${fallback}]` : ""}: `)).trim() ||
    fallback;
  rl.close();

  if (!email) throw new Error("An email is required.");

  const password = await secret("Password (not shown): ");
  if (password.length < 12) {
    throw new Error("Use at least 12 characters. This is the only door.");
  }
  const again = await secret("Again: ");
  if (password !== again) throw new Error("Those did not match.");

  const password_hash = await hashPassword(password);

  const { data: existing } = await db()
    .from("admin_users")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (existing) {
    const { error } = await db()
      .from("admin_users")
      .update({ password_hash })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    console.log(`\nPassword set for ${email}.`);
  } else {
    const { error } = await db()
      .from("admin_users")
      .insert({ email, role: "owner", password_hash });
    if (error) throw new Error(error.message);
    console.log(`\nOwner account created for ${email}.`);
  }

  console.log("Sign in at /admin/login");
}

main().catch((error) => {
  console.error("\n" + (error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
