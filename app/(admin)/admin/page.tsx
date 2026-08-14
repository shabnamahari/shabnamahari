import Link from "next/link";

import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/chatbot/db/client";
import SignOut from "@/components/admin/SignOut";

export const dynamic = "force-dynamic";

/**
 * What the panel will hold, and what it holds today.
 *
 * The sections are listed before they are built, and say so. A shell that
 * quietly omits what is not finished leaves the operator guessing whether a
 * thing is missing or merely hidden.
 */
const SECTIONS = [
  { name: "Knowledge base", note: "What the bot may answer from", href: "/admin/knowledge" },
  { name: "Model", note: "Which model answers, and the fallback" },
  { name: "Prompt", note: "What Sir Cue is told to be", href: "/admin/prompt" },
  { name: "Playground", note: "One question, both languages, side by side" },
  {
    name: "Conversations",
    note: "What people actually asked",
    href: "/admin/conversations",
  },
  {
    name: "People",
    note: "Who left a name, a number, or an exam date",
    href: "/admin/leads",
  },
  {
    name: "Waiting for you",
    note: "Conversations the bot handed over",
    href: "/admin/queue",
  },
  {
    name: "How it is going",
    note: "Volume, language, channel, and what it cost",
    href: "/admin/dashboard",
  },
] as const satisfies readonly { name: string; note: string; href?: string }[];

async function counts() {
  const client = db();
  const [documents, chunks, conversations, people, unanswered] = await Promise.all([
    client.from("documents").select("id", { count: "exact", head: true }),
    client.from("chunks").select("id", { count: "exact", head: true }),
    client.from("conversations").select("id", { count: "exact", head: true }),
    client.from("leads").select("id", { count: "exact", head: true }),
    client.from("unanswered").select("id", { count: "exact", head: true }),
  ]);

  return [
    { label: "Documents", value: documents.count ?? 0 },
    { label: "Chunks", value: chunks.count ?? 0 },
    { label: "Conversations", value: conversations.count ?? 0 },
    // The one number on this row that is worth money rather than upkeep.
    { label: "People", value: people.count ?? 0 },
    { label: "Unanswered", value: unanswered.count ?? 0 },
  ];
}

export default async function AdminHome() {
  const admin = await requireAdmin();
  const stats = await counts();

  return (
    <main className="mx-auto max-w-3xl px-[15px] py-16">
      <header className="border-rule flex items-baseline justify-between border-b pb-6">
        <div>
          <h1 className="font-nhm text-2xl font-bold tracking-tight">Panel</h1>
          <p className="text-muted-ink mt-1 text-sm">
            {admin.email} · {admin.role === "owner" ? "owner" : "read only"}
          </p>
        </div>
        <SignOut />
      </header>

      <section className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="font-nhm text-3xl font-bold tabular-nums">
              {stat.value}
            </div>
            <div className="text-muted-ink mt-1 text-xs tracking-wide uppercase">
              {stat.label}
            </div>
          </div>
        ))}
      </section>

      <section className="mt-14">
        <h2 className="text-muted-ink text-xs tracking-wide uppercase">
          Sections
        </h2>
        <ul className="border-rule mt-4 border-t">
          {SECTIONS.map((section) => (
            <li
              key={section.name}
              className="border-rule flex items-center justify-between border-b py-4"
            >
              <div>
                <div className="text-[0.9375rem]">
                  {"href" in section ? (
                    <Link href={section.href} className="underline underline-offset-4">
                      {section.name}
                    </Link>
                  ) : (
                    section.name
                  )}
                </div>
                <div className="text-muted-ink text-sm">{section.note}</div>
              </div>
              <span className="text-muted-ink text-xs tracking-wide uppercase">
                {"href" in section ? "open" : "not built yet"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-muted-ink mt-14 text-sm">
        <Link href="/" className="underline underline-offset-4">
          Back to the site
        </Link>
      </p>
    </main>
  );
}
