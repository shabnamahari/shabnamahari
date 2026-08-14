import Link from "next/link";

import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/chatbot/db/client";

export const dynamic = "force-dynamic";

/**
 * How long a window may be, and what it is called.
 *
 * "How is it going" is a question about lately, so the page defaults to a
 * month. All time is there because at this stage it is the same thing.
 */
const RANGES = [
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "90 days", days: 90 },
  { key: "all", label: "All time", days: null },
] as const;

/**
 * The fewest conversations a percentage may be calculated from.
 *
 * The brand guide is explicit that authority comes from method and never from
 * statistics that do not exist yet — it refuses to put a figure in its own
 * third voice trait for exactly this reason. "Sixty-seven per cent become
 * leads" out of three conversations is that mistake in a dashboard: a number
 * that reads as evidence and is two people. Below this the counts are shown and
 * the rate is not.
 */
const ENOUGH_FOR_A_RATE = 20;

type Data = {
  conversations: number;
  people: number;
  messages: number;
  answers: number;
  placement_sent: number;
  leads: number;
  reachable: number;
  marked_wrong: number;
  unanswered: number;
  avg_messages: number | null;
  median_seconds: number | null;
  split: { channel: string; lang: string; conversations: number }[];
  drawn_from: { title: string; times: number }[];
  by_model: {
    model: string;
    messages: number;
    tokens_in: number;
    tokens_out: number;
    cost: number;
  }[];
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdmin();

  const { range: raw } = await searchParams;
  const range = RANGES.find((r) => r.key === raw) ?? RANGES[1];

  // The window is sent as a number of days and the boundary is worked out in
  // the database. Reading a clock here would be reading it during render, and
  // it would be this server's clock deciding which of the database's rows come
  // back — when the database has one of its own and owns the rows.
  const { data } = await db().rpc("dashboard", { p_days: range.days });
  const d = (data ?? {}) as Data;

  const rate = (part: number, whole: number): string | null =>
    whole >= ENOUGH_FOR_A_RATE ? `${Math.round((part / whole) * 100)}%` : null;

  return (
    <main className="mx-auto max-w-3xl px-[15px] py-16">
      <header className="border-rule border-b pb-6">
        <Link
          href="/admin"
          className="text-muted-ink hover:text-ink text-sm underline underline-offset-4 transition-colors"
        >
          ← Panel
        </Link>
        <h1 className="font-nhm mt-3 text-2xl font-bold tracking-tight">
          How it is going
        </h1>
        <nav className="mt-4 flex gap-4">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={`/admin/dashboard?range=${r.key}`}
              className={
                r.key === range.key
                  ? "text-ink text-sm underline underline-offset-4"
                  : "text-muted-ink hover:text-ink text-sm transition-colors"
              }
            >
              {r.label}
            </Link>
          ))}
        </nav>
      </header>

      {d.conversations === 0 ? (
        <p className="text-muted-ink mt-12 text-sm">
          Nothing in this window yet. Every conversation on the site, the widget
          or Telegram counts here from the moment it starts.
        </p>
      ) : null}

      <Section title="Who came">
        <Figures
          items={[
            { label: "Conversations", value: d.conversations },
            { label: "People", value: d.people },
            { label: "Messages", value: d.messages },
          ]}
        />
        <Bars
          rows={(d.split ?? []).map((s) => ({
            label: `${s.channel} · ${s.lang}`,
            value: s.conversations,
          }))}
          total={d.conversations}
          empty="No conversations in this window."
        />
      </Section>

      <Section title="What came of it">
        <Figures
          items={[
            {
              label: "Given the assessment link",
              value: d.placement_sent,
              note: rate(d.placement_sent, d.conversations),
            },
            {
              label: "Left details",
              value: d.leads,
              note: rate(d.leads, d.conversations),
            },
            { label: "Reachable", value: d.reachable },
          ]}
        />
        {d.conversations > 0 && d.conversations < ENOUGH_FOR_A_RATE ? (
          <p className="text-muted-ink mt-3 text-sm">
            No percentages until {ENOUGH_FOR_A_RATE} conversations. A rate out of{" "}
            {d.conversations} reads as evidence and is not — the same rule the
            brand guide sets for the site itself.
          </p>
        ) : null}
      </Section>

      <Section title="How the conversations went">
        <Figures
          items={[
            {
              label: "Messages each",
              value: d.avg_messages ?? "—",
            },
            {
              label: "Typical length",
              value:
                d.median_seconds == null ? "—" : minutes(Number(d.median_seconds)),
              // The median, not the mean: one tab left open overnight moves an
              // average by an hour and describes nobody.
              note: "median",
            },
            {
              label: "Answers marked wrong",
              value: d.marked_wrong,
              note: rate(d.marked_wrong, d.answers),
            },
            { label: "Found nothing to answer from", value: d.unanswered },
          ]}
        />
      </Section>

      <Section title="What the answers came from">
        <Bars
          rows={(d.drawn_from ?? []).map((t) => ({
            label: t.title,
            value: t.times,
          }))}
          total={(d.drawn_from ?? []).reduce((s, t) => s + t.times, 0)}
          empty="Nothing retrieved in this window."
        />
        <p className="text-muted-ink mt-3 text-sm">
          Which part of the knowledge base kept being needed. Not the questions
          people asked — nothing here has clustered those — but the closest
          honest thing to it, and the one that says what to write more of.
        </p>
      </Section>

      <Section title="What it cost">
        {(d.by_model ?? []).length === 0 ? (
          <p className="text-muted-ink text-sm">No answers in this window.</p>
        ) : (
          <ul className="border-rule mt-4 border-t">
            {d.by_model.map((m) => (
              <li
                key={m.model}
                className="border-rule flex items-baseline justify-between gap-4 border-b py-3"
              >
                <span className="text-[0.9375rem]">{m.model}</span>
                <span className="text-muted-ink shrink-0 text-xs tabular-nums">
                  {m.messages} answer{m.messages === 1 ? "" : "s"} ·{" "}
                  {(m.tokens_in + m.tokens_out).toLocaleString("en-GB")} tokens ·{" "}
                  {Number(m.cost) === 0 ? "free" : `$${Number(m.cost).toFixed(4)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </main>
  );
}

/** Seconds as the largest unit that is not a lie. */
function minutes(seconds: number): string {
  if (seconds < 90) return `${Math.round(seconds)}s`;
  const m = Math.round(seconds / 60);
  return m < 90 ? `${m}m` : `${Math.round(m / 60)}h`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="text-muted-ink text-xs tracking-wide uppercase">{title}</h2>
      {children}
    </section>
  );
}

function Figures({
  items,
}: {
  items: { label: string; value: number | string; note?: string | null }[];
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="font-nhm text-3xl font-bold tabular-nums">
            {item.value}
            {item.note ? (
              <span className="text-muted-ink ml-2 text-sm font-normal">
                {item.note}
              </span>
            ) : null}
          </div>
          <div className="text-muted-ink mt-1 text-xs tracking-wide uppercase">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * A row per value, with a bar drawn in ink.
 *
 * No chart library. Four bars and a percentage width is not a dependency's
 * worth of problem, and the palette here is two colours on purpose.
 */
function Bars({
  rows,
  total,
  empty,
}: {
  rows: { label: string; value: number }[];
  total: number;
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="text-muted-ink mt-4 text-sm">{empty}</p>;
  }

  const largest = Math.max(...rows.map((r) => r.value), 1);

  return (
    <ul className="mt-4 flex flex-col gap-2.5">
      {rows.map((row) => (
        <li key={row.label} className="flex items-center gap-3">
          <span className="w-44 shrink-0 truncate text-sm">{row.label}</span>
          <span
            className="bg-ink h-2 shrink-0"
            style={{ width: `${Math.max((row.value / largest) * 60, 1)}%` }}
          />
          <span className="text-muted-ink shrink-0 text-xs tabular-nums">
            {row.value}
            {total > 0 ? ` · ${Math.round((row.value / total) * 100)}%` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
