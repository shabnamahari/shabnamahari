import Link from "next/link";

import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/chatbot/db/client";
import LeadRow, { type Lead } from "@/components/admin/LeadRow";
import type { LeadStatus } from "@/lib/admin/leads";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  name: string | null;
  contact: string | null;
  target_band: number | null;
  exam_date: string | null;
  taken_before: boolean | null;
  placement_status: string;
  notify_on_launch: boolean;
  source: string;
  status: string;
  notes: string | null;
  conversation_id: string | null;
  created_at: string;
};

/**
 * Everyone who told the bot something about themselves.
 *
 * These rows have been accumulating since the day the assistant went live —
 * `capture_lead` writes them mid-conversation — and until now there was no
 * screen that read them back. Somebody could have left a phone number weeks ago
 * and nobody would know.
 *
 * The ordering is the argument of the page. Not newest first: soonest exam
 * first, because that is the only field with a deadline attached to it, and a
 * lead sitting two weeks from their test is worth more attention than one who
 * happened to write yesterday. Everyone without a date follows, newest first.
 */
export default async function LeadsPage() {
  const admin = await requireAdmin();

  const { data } = await db()
    .from("leads")
    .select(
      "id, name, contact, target_band, exam_date, taken_before, placement_status, notify_on_launch, source, status, notes, conversation_id, created_at",
    )
    .order("created_at", { ascending: false });

  const leads: Lead[] = ((data ?? []) as Row[]).map((row) => ({
    id: row.id,
    name: row.name,
    contact: row.contact,
    targetBand: row.target_band,
    examDate: row.exam_date,
    takenBefore: row.taken_before,
    placementStatus: row.placement_status,
    notifyOnLaunch: row.notify_on_launch,
    source: row.source,
    status: row.status as LeadStatus,
    notes: row.notes,
    conversationId: row.conversation_id,
    createdAt: row.created_at,
  }));

  const dated = leads
    .filter((lead) => lead.examDate)
    .sort((a, b) => (a.examDate! < b.examDate! ? -1 : 1));
  const undated = leads.filter((lead) => !lead.examDate);

  const reachable = leads.filter((lead) => lead.contact);
  const waiting = leads.filter((lead) => lead.notifyOnLaunch);

  return (
    <main className="mx-auto max-w-3xl px-gutter py-16">
      <header className="border-rule border-b pb-6">
        <Link
          href="/admin"
          className="text-muted-ink hover:text-ink text-sm underline underline-offset-4 transition-colors"
        >
          ← Panel
        </Link>
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="font-instrument-sans mt-3 text-2xl font-bold tracking-tight">People</h1>
          {leads.length > 0 ? (
            // A plain link, not a button: it is a GET that returns a file, and
            // the browser already knows how to do that.
            <a
              href="/admin/leads/export"
              className="text-muted-ink hover:text-ink shrink-0 text-sm underline underline-offset-4 transition-colors"
            >
              Download as CSV
            </a>
          ) : null}
        </div>
        <p className="text-muted-ink mt-1 text-sm">
          Everyone who told Sir Cue something about themselves. Only what they
          actually said — the bot records nothing it was not given.
        </p>
      </header>

      <section className="mt-10 grid grid-cols-3 gap-x-6">
        <Count label="People" value={leads.length} />
        <Count label="Reachable" value={reachable.length} />
        <Count label="Awaiting launch" value={waiting.length} />
      </section>

      {admin.role !== "owner" ? (
        <p className="text-muted-ink mt-8 text-sm">
          This account can read but not change anything.
        </p>
      ) : null}

      {leads.length === 0 ? (
        <p className="text-muted-ink mt-12 text-sm">
          Nobody yet. A row appears here the moment someone gives the bot a
          name, a number, a target band or an exam date.
        </p>
      ) : null}

      {dated.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-muted-ink text-xs tracking-wide uppercase">
            With an exam date · {dated.length}
          </h2>
          <p className="text-muted-ink mt-2 text-sm">
            Soonest first. This is the order to work down.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {dated.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                canEdit={admin.role === "owner"}
              />
            ))}
          </div>
        </section>
      ) : null}

      {undated.length > 0 ? (
        <section className="mt-14">
          <h2 className="text-muted-ink text-xs tracking-wide uppercase">
            No date yet · {undated.length}
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            {undated.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                canEdit={admin.role === "owner"}
              />
            ))}
          </div>
        </section>
      ) : null}

      {waiting.length > 0 ? (
        <p className="text-muted-ink mt-14 text-sm">
          {waiting.length === 1 ? "One person is" : `${waiting.length} people are`}{" "}
          waiting to hear when the course material is published. That was a
          promise the bot made on your behalf — open the row and mark it once you
          have kept it.
        </p>
      ) : null}
    </main>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-instrument-sans text-3xl font-bold tabular-nums">{value}</div>
      <div className="text-muted-ink mt-1 text-xs tracking-wide uppercase">
        {label}
      </div>
    </div>
  );
}
