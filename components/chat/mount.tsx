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

/**
 * The greeting, or the one written here if the database cannot say.
 *
 * Every page in `(site)` renders this, so anything it throws takes the whole
 * static export with it — which is exactly what happened on the first deploy:
 * no keys in the build environment, `db()` threw before it could run a query,
 * and a marketing site with four static pages failed to build over a greeting
 * it has a hardcoded copy of two lines above.
 *
 * So the connection is treated the way the row already was. A missing greeting
 * is a content problem; it is not a reason to withhold the assistant, and it is
 * certainly not a reason to withhold the site.
 */
async function fetchCopy(): Promise<Record<Lang, Copy>> {
  const copy = { ...FALLBACK };

  try {
    const { data, error } = await db()
      .from("channel_copy")
      .select("lang, welcome")
      .eq("channel", "web");

    if (error || !data) return copy;

    for (const row of data) {
      const lang = row.lang as Lang;
      if (row.welcome) copy[lang] = { welcome: row.welcome };
    }
  } catch {
    // No credentials, or no database to reach. Both mean the same thing here.
  }

  return copy;
}

export default async function AssistantMount() {
  return <Assistant copy={await fetchCopy()} />;
}
