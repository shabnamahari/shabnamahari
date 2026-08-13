import type { Lang } from "@/lib/chatbot/core/types";

/**
 * What the channel itself says, as opposed to what the assistant answers.
 *
 * Commands, confirmations and failures — none of which are the model's words,
 * and none of which should be. They are here rather than in the database
 * because they are part of the channel, like a button label: `channel_copy`
 * holds the greeting because that is Shabnam's writing and she should be able
 * to change it, and this is plumbing.
 *
 * The Persian is not a translation of the English. It is what the same thing
 * sounds like said in Persian, which is the rule the rest of the bot follows.
 */

export const TG: Record<Lang, Record<string, string>> = {
  en: {
    help: [
      "I answer questions about Shabnam's courses and about joining one — what each course covers, how it runs, and where to begin.",
      "",
      "/lang — switch between English and Persian",
      "/reset — start a fresh conversation",
      "/help — this message",
    ].join("\n"),
    reset: "Started fresh. Ask me anything.",
    switched: "Now answering in English.",
    thinking: "…",
    failed: "That did not go through. Try again.",
    tooLong: "That is longer than I can read. Send the question on its own.",
    notText: "I can only read text.",
  },
  fa: {
    help: [
      "من به سؤال‌های شما درباره‌ی دوره‌های شبنم و ثبت‌نام جواب می‌دهم — اینکه هر دوره شامل چه چیزی است، چطور برگزار می‌شود، و از کجا باید شروع کرد.",
      "",
      "‏/lang — تغییر زبان بین فارسی و انگلیسی",
      "‏/reset — شروع یک گفتگوی تازه",
      "‏/help — همین پیام",
    ].join("\n"),
    reset: "از نو شروع کردیم. هر سؤالی داری بپرس.",
    switched: "از این به بعد فارسی جواب می‌دهم.",
    thinking: "…",
    failed: "نرسید. یک بار دیگر بفرستید.",
    tooLong: "این طولانی‌تر از آن است که بتوانم بخوانم. سؤالتان را جدا بفرستید.",
    notText: "فقط متن می‌توانم بخوانم.",
  },
};
