import "../load-env";
import { randomUUID } from "node:crypto";
import { converse } from "@/lib/chatbot/core/converse";
import { db } from "@/lib/chatbot/db/client";

const user = `dbg-${randomUUID()}`;
let cid: string | undefined;
for (const q of ["دوره‌ی نمره‌ی ۷ چند جلسه است؟", "بله لطفاً خبرم کنید. الهام هستم، ۰۹۱۲۱۲۳۴۵۶۷"]) {
  console.log(`\nUSER  ${q}`);
  for await (const e of converse({ channel: "web", externalUserId: user, text: q, conversationId: cid })) {
    if (e.type === "conversation") cid = e.conversationId;
    else if (e.type === "delta") process.stdout.write(e.text);
    else if (e.type === "tool") console.log(`\n[TOOL ${e.name} → ${e.result}]`);
    else if (e.type === "done") console.log(`\n[done ${e.model} · in ${e.tokensIn} · out ${e.tokensOut}]`);
    else if (e.type === "error") console.log(`\n[ERROR ${e.message.slice(0,200)}]`);
  }
}
const { data } = await db().from("leads").select("name,contact,notify_on_launch").eq("conversation_id", cid!).maybeSingle();
console.log(`\nleads → ${data ? JSON.stringify(data) : "NO ROW"}`);
const { data: msgs } = await db().from("messages").select("role,content").eq("conversation_id", cid!).order("created_at");
console.log(`messages stored: ${msgs?.map(m => `${m.role}(${m.content.length})`).join(", ")}`);
await db().from("leads").delete().eq("conversation_id", cid!);
await db().from("conversations").delete().eq("id", cid!);
