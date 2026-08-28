import Link from "next/link";

import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/chatbot/db/client";
import DocumentEditor from "@/components/admin/DocumentEditor";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  title: string;
  lang: string;
  source_type: string;
  source_url: string | null;
  status: string;
  raw_text: string | null;
  updated_at: string;
};

/**
 * Everything the bot is allowed to answer from, and the questions it could not.
 *
 * The two belong on one page: the list of gaps is only useful next to the thing
 * that closes them. Someone reading "what does the cancellation policy say" in
 * the unanswered column should be one scroll from writing the answer.
 */
export default async function KnowledgePage() {
  const admin = await requireAdmin();
  const client = db();

  const [{ data: documents }, { data: gaps }, { data: chunkRows }] =
    await Promise.all([
      client
        .from("documents")
        .select("id, title, lang, source_type, source_url, status, raw_text, updated_at")
        .order("updated_at", { ascending: false }),
      client
        .from("unanswered")
        .select("id, question, lang, best_similarity, created_at")
        .eq("resolved", false)
        .order("created_at", { ascending: false })
        .limit(40),
      client.from("chunks").select("document_id"),
    ]);

  const chunkCount = new Map<string, number>();
  for (const row of chunkRows ?? []) {
    const id = (row as { document_id: string }).document_id;
    chunkCount.set(id, (chunkCount.get(id) ?? 0) + 1);
  }

  const rows = (documents ?? []) as Row[];
  const written = rows.filter((d) => d.source_type === "text");
  const crawled = rows.filter((d) => d.source_type !== "text");

  return (
    <main className="mx-auto max-w-3xl px-gutter py-16">
      <header className="border-rule border-b pb-6">
        <Link
          href="/admin"
          className="text-muted-ink hover:text-ink text-sm underline underline-offset-4 transition-colors"
        >
          ← Panel
        </Link>
        <h1 className="font-instrument-sans mt-3 text-2xl font-bold tracking-tight">
          Knowledge base
        </h1>
        <p className="text-muted-ink mt-1 text-sm">
          Everything Sir Cue is allowed to answer from. Nothing else.
        </p>
      </header>

      {admin.role !== "owner" ? (
        <p className="text-muted-ink mt-8 text-sm">
          This account can read but not change anything.
        </p>
      ) : null}

      <section className="mt-12">
        <h2 className="text-muted-ink text-xs tracking-wide uppercase">
          Written here · {written.length}
        </h2>
        <div className="mt-4 flex flex-col gap-3">
          {written.map((doc) => (
            <DocumentEditor
              key={doc.id}
              id={doc.id}
              title={doc.title}
              lang={doc.lang === "fa" ? "fa" : "en"}
              text={doc.raw_text ?? ""}
              chunks={chunkCount.get(doc.id) ?? 0}
              status={doc.status}
              updatedAt={doc.updated_at}
              canEdit={admin.role === "owner"}
            />
          ))}
          {admin.role === "owner" ? <DocumentEditor canEdit /> : null}
        </div>
      </section>

      {crawled.length > 0 ? (
        <section className="mt-14">
          <h2 className="text-muted-ink text-xs tracking-wide uppercase">
            From the site · {crawled.length}
          </h2>
          <p className="text-muted-ink mt-2 text-sm">
            Read only here. These are rewritten whenever the site is crawled, so
            an edit made in this panel would be silently thrown away.
          </p>
          <ul className="border-rule mt-4 border-t">
            {crawled.map((doc) => (
              <li
                key={doc.id}
                className="border-rule flex items-baseline justify-between gap-4 border-b py-3"
              >
                <span className="text-[0.9375rem]">{doc.title}</span>
                <span className="text-muted-ink shrink-0 text-xs tabular-nums">
                  {doc.lang} · {chunkCount.get(doc.id) ?? 0} chunks
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-14">
        <h2 className="text-muted-ink text-xs tracking-wide uppercase">
          Asked, and not answered · {gaps?.length ?? 0}
        </h2>
        <p className="text-muted-ink mt-2 text-sm">
          Questions the bot found nothing for. Each one is either something to
          write above, or something it is right to refuse.
        </p>
        {gaps && gaps.length > 0 ? (
          <ul className="border-rule mt-4 border-t">
            {gaps.map((gap) => (
              <li
                key={gap.id as string}
                className="border-rule flex items-baseline justify-between gap-4 border-b py-3"
              >
                <span
                  dir={gap.lang === "fa" ? "rtl" : "ltr"}
                  className={`text-[0.9375rem] ${
                    gap.lang === "fa" ? "font-vazirmatn" : ""
                  }`}
                >
                  {gap.question as string}
                </span>
                <span className="text-muted-ink shrink-0 text-xs tabular-nums">
                  {/* Nothing close, versus just under the line — a content
                      problem versus a tuning one. */}
                  {gap.best_similarity == null
                    ? "no match"
                    : `${Math.round((gap.best_similarity as number) * 100)}%`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-ink mt-4 text-sm">Nothing outstanding.</p>
        )}
      </section>
    </main>
  );
}
