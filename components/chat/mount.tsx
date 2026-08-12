import Assistant, { type Copy } from "@/components/chat/Assistant";
import { db } from "@/lib/chatbot/db/client";
import type { Lang } from "@/lib/chatbot/core/types";

/**
 * Reads the assistant's opening lines and mounts it over the site.
 *
 * Both languages are fetched and handed over together, on purpose: the switch
 * has to be instant and work with no network. Someone who opens in English,
 * reads two lines and decides they would rather read Persian should not wait for
 * a round trip to find that out. Two short strings cost less than the request
 * would.
 */

const FALLBACK: Record<Lang, Copy> = {
  en: {
    welcome:
      "I'm Sir Cue, Shabnam's assistant. I can answer questions about the courses and about joining one.",
  },
  fa: {
    welcome:
      "من Sir Cue هستم، دستیارِ شبنم. می‌توانم به سؤال‌های شما درباره‌ی دوره‌ها و ثبت‌نام جواب بدهم.",
  },
};

export default async function AssistantMount() {
  const { data, error } = await db()
    .from("channel_copy")
    .select("lang, welcome")
    .eq("channel", "web");

  // A missing row is a content problem, not a reason to withhold the assistant:
  // the conversation does not depend on the greeting.
  const copy = { ...FALLBACK };
  if (!error && data) {
    for (const row of data) {
      const lang = row.lang as Lang;
      if (row.welcome) copy[lang] = { welcome: row.welcome };
    }
  }

  return <Assistant copy={copy} />;
}
