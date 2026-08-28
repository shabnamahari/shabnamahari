import Link from "next/link";

import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/chatbot/db/client";
import PromptEditor from "@/components/admin/PromptEditor";
import type { Lang } from "@/lib/chatbot/core/types";

export const dynamic = "force-dynamic";

type Version = {
  id: string;
  lang: string;
  version: number;
  is_active: boolean;
  note: string | null;
  content: string;
  created_at: string;
};

/**
 * What Sir Cue is told to be, in each language.
 *
 * Two prompts, not one translated. The rules are not the same on both sides:
 * the English one carries the comprehension rule for a B1–B2 reader, the
 * Persian one carries the pronoun sequence and the no-Latin-script rule. A
 * single prompt with a "reply in Persian" line at the end would lose both.
 */
export default async function PromptPage() {
  const admin = await requireAdmin();

  const { data } = await db()
    .from("prompt_versions")
    .select("id, lang, version, is_active, note, content, created_at")
    .order("version", { ascending: false });

  const all = (data ?? []) as Version[];
  const forLang = (lang: Lang) => all.filter((v) => v.lang === lang);

  return (
    <main className="mx-auto max-w-3xl px-gutter py-16">
      <header className="border-rule border-b pb-6">
        <Link
          href="/admin"
          className="text-muted-ink hover:text-ink text-sm underline underline-offset-4 transition-colors"
        >
          ← Panel
        </Link>
        <h1 className="font-instrument-sans mt-3 text-2xl font-bold tracking-tight">Prompt</h1>
        <p className="text-muted-ink mt-1 text-sm">
          What Sir Cue is told to be, before it is told anything else. Saving
          writes a new version and makes it live — nothing is overwritten, and
          any earlier one can be put back.
        </p>
      </header>

      {admin.role !== "owner" ? (
        <p className="text-muted-ink mt-8 text-sm">
          This account can read but not change anything.
        </p>
      ) : null}

      {(["en", "fa"] as const).map((lang) => {
        const versions = forLang(lang);
        const active = versions.find((v) => v.is_active) ?? versions[0];
        if (!active) return null;

        return (
          <PromptEditor
            key={lang}
            lang={lang}
            heading={lang === "en" ? "English" : "فارسی"}
            active={{
              version: active.version,
              content: active.content,
              note: active.note,
            }}
            history={versions.map((v) => ({
              id: v.id,
              version: v.version,
              note: v.note,
              isActive: v.is_active,
              createdAt: v.created_at,
            }))}
            canEdit={admin.role === "owner"}
          />
        );
      })}

      <p className="text-muted-ink mt-14 text-sm">
        The banned words, the allowed Latin terms and the contact details are not
        here — they are sent with every question from <code>settings</code>, so
        that changing one is an edit in one place rather than a new version of
        each prompt.
      </p>
    </main>
  );
}
