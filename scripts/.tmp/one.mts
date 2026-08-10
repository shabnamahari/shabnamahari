import "../load-env";
import { randomUUID } from "node:crypto";
import { converse } from "@/lib/chatbot/core/converse";
import { db } from "@/lib/chatbot/db/client";

const user = `dbg-${randomUUID()}`;
let cid: string | undefined;
// Single turn, no history, so nothing is ambiguous about which turn failed.
for await (const e of converse({
  channel: "web", externalUserId: user,
  text: "خبرم کنید لطفاً. الهام هستم، ۰۹۱۲۱۲۳۴۵۶۷",
})) {
  if (e.type === "conversation") { cid = e.conversationId; console.log(`[conversation ${e.lang}]`); }
  else if (e.type === "sources") console.log(`[sources ${e.citations.length}]`);
  else if (e.type === "delta") process.stdout.write(e.text);
  else if (e.type === "tool") console.log(`\n[TOOL ${e.name} → ${e.result}]`);
  else if (e.type === "done") console.log(`\n[done ${e.model} · in ${e.tokensIn} · out ${e.tokensOut} · fallback=${e.usedFallback}]`);
  else if (e.type === "error") console.log(`\n[ERROR ${e.message.slice(0,200)}]`);
}
const { data } = await db().from("leads").select("name,contact,notify_on_launch").eq("conversation_id", cid!).maybeSingle();
console.log(`leads → ${data ? JSON.stringify(data) : "NO ROW"}`);
await db().from("leads").delete().eq("conversation_id", cid!);
await db().from("conversations").delete().eq("id", cid!);
