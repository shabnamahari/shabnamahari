import { currentAdmin, recordAction } from "@/lib/admin/auth";
import { db } from "@/lib/chatbot/db/client";
import { LEAD_STATUS_LABEL, type LeadStatus } from "@/lib/admin/leads";

/**
 * Everyone in `leads`, as a file.
 *
 * The one thing on this page that leaves the building. It is a list of real
 * people with real phone numbers, so it is behind the same check as the page
 * itself and the download is written to the audit log — not because a download
 * is suspicious, but because "who took the contact list off the panel, and
 * when" is a question worth being able to answer.
 *
 * Under `/admin`, so `proxy.ts` turns away anyone with no session before the
 * request arrives. That is optimistic by design, hence the real check below.
 */

export const dynamic = "force-dynamic";

type Row = {
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
  created_at: string;
};

const COLUMNS = [
  "Name",
  "Contact",
  "Target band",
  "Exam date",
  "Sat IELTS before",
  "Assessment",
  "Awaiting launch",
  "Came from",
  "Status",
  "Notes",
  "First said",
];

/**
 * One CSV cell.
 *
 * Quoted whenever it holds a comma, a quote or a newline, with inner quotes
 * doubled — the notes field is free text somebody typed, so all three are
 * ordinary. A cell that also starts with `=`, `+`, `-` or `@` is prefixed with
 * a quote: spreadsheets read those as formulas, and a contact field is written
 * by whoever is talking to the bot.
 */
function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value);

  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;

  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(): Promise<Response> {
  const admin = await currentAdmin();
  if (!admin) return new Response("forbidden", { status: 403 });

  const { data } = await db()
    .from("leads")
    .select(
      "name, contact, target_band, exam_date, taken_before, placement_status, notify_on_launch, source, status, notes, created_at",
    )
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as Row[];

  const lines = [
    COLUMNS.join(","),
    ...rows.map((row) =>
      [
        row.name,
        row.contact,
        row.target_band,
        row.exam_date,
        row.taken_before === null ? "" : row.taken_before ? "Yes" : "No",
        row.placement_status === "unknown" ? "" : row.placement_status,
        row.notify_on_launch ? "Yes" : "",
        row.source,
        LEAD_STATUS_LABEL[row.status as LeadStatus] ?? row.status,
        row.notes,
        row.created_at.slice(0, 10),
      ]
        .map(cell)
        .join(","),
    ),
  ];

  await recordAction(admin, "leads.export", undefined, { rows: rows.length });

  const today = new Date().toISOString().slice(0, 10);

  return new Response(
    // The byte order mark is not decoration. Excel opens a .csv as the system's
    // legacy encoding unless it finds one, and every Persian name and note in
    // this file comes out as mojibake — the export would look broken for
    // exactly the rows Shabnam most needs to read.
    `﻿${lines.join("\r\n")}\r\n`,
    {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="people-${today}.csv"`,
        // A list of phone numbers should not sit in a shared cache.
        "cache-control": "no-store",
      },
    },
  );
}
