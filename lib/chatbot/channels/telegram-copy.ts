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
    tooMany: "That is a lot of questions at once. Give it a minute and ask again.",
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
    tooMany: "سؤال‌ها پشت سر هم زیاد شد. یک دقیقه صبر کنید و دوباره بپرسید.",
    notText: "فقط متن می‌توانم بخوانم.",
  },
};

/**
 * What Telegram shows about the bot before anyone has said anything to it.
 *
 * This is the only copy in the project that no request ever renders — it lives
 * on Telegram's servers, set once by `npm run tg:profile`. It had been set by
 * hand, which meant the words a stranger reads first existed nowhere anybody
 * could find them, and a new bot token would have started blank with nobody
 * knowing what to type back in.
 *
 * The name is not translated. It is the mark, and a mark that changes shape by
 * language is two marks — the same rule that keeps the tagline in English
 * inside Persian copy.
 */
export const TG_PROFILE = {
  name: "Sir Cue",

  /**
   * The default is bilingual and the Persian entry is not.
   *
   * Telegram picks by the reader's app language, and plenty of Shabnam's
   * audience run Telegram in English while asking in Persian. So the default —
   * what everyone outside a named language sees — carries both, and someone
   * whose app is actually in Persian is not made to read past an English
   * paragraph to reach their own.
   */
  en: {
    /** Above the START button on an empty chat. Telegram's limit is 120. */
    short: "Shabnam Ahari's assistant. Ask about the courses and how to begin.",
    /** The bot's profile page. Telegram's limit is 512. */
    description: [
      "I'm Sir Cue, Shabnam Ahari's assistant. Ask me about the IELTS courses — what each one covers, how sessions run, and where to begin.",
      "",
      "من Sir Cue هستم، دستیارِ شبنم آهاری. درباره‌ی دوره‌های آیلتس بپرسید — اینکه هر دوره شامل چه چیزی است، جلسه‌ها چطور برگزار می‌شوند، و از کجا باید شروع کرد.",
    ].join("\n"),
    commands: [
      { command: "start", description: "Start over" },
      { command: "help", description: "What I can answer" },
      { command: "reset", description: "A fresh conversation" },
      { command: "lang", description: "English / فارسی" },
    ],
  },

  fa: {
    short: "دستیارِ شبنم آهاری. درباره‌ی دوره‌ها و اینکه از کجا شروع کنید بپرسید.",
    description:
      "من Sir Cue هستم، دستیارِ شبنم آهاری. درباره‌ی دوره‌های آیلتس بپرسید — اینکه هر دوره شامل چه چیزی است، جلسه‌ها چطور برگزار می‌شوند، و از کجا باید شروع کرد.",
    // The command itself stays Latin — Telegram only accepts a-z, 0-9 and _ —
    // and only the line beside it is Persian. That is also how a person types
    // it, so translating the name would describe something they cannot send.
    commands: [
      { command: "start", description: "از نو" },
      { command: "help", description: "چه چیزهایی را جواب می‌دهم" },
      { command: "reset", description: "یک گفتگوی تازه" },
      { command: "lang", description: "English / فارسی" },
    ],
  },
} as const;
