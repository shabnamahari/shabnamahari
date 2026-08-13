"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import {
  LEAD_STATUSES,
  markNotified,
  updateLead,
  type LeadStatus,
} from "@/app/(admin)/admin/leads/actions";

export type Lead = {
  id: string;
  name: string | null;
  contact: string | null;
  targetBand: number | null;
  examDate: string | null;
  takenBefore: boolean | null;
  placementStatus: string;
  notifyOnLaunch: boolean;
  source: string;
  status: LeadStatus;
  notes: string | null;
  conversationId: string | null;
  createdAt: string;
};

const LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  placement_taken: "Took the assessment",
  enrolled: "Enrolled",
  lost: "Lost",
};

/** Days from today, negative once the date has passed. */
function daysAway(date: string): number {
  const then = new Date(`${date}T00:00:00`).getTime();
  const today = new Date(new Date().toDateString()).getTime();
  return Math.round((then - today) / 86_400_000);
}

/**
 * One person, closed until you open it.
 *
 * Shut, it carries the four things that decide whether to open it: who they
 * are, how to reach them, when they sit the exam, and where they got to. The
 * exam date is the one that ages — a lead with three weeks left is a different
 * lead from the same one with three days left, so the row says which.
 */
export default function LeadRow({
  lead,
  canEdit,
}: {
  lead: Lead;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  const dirty = status !== lead.status || notes !== (lead.notes ?? "");
  const away = lead.examDate ? daysAway(lead.examDate) : null;

  function save() {
    setMessage(null);
    start(async () => {
      const result = await updateLead({ id: lead.id, status, notes });
      setFailed(!result.ok);
      setMessage(result.ok ? "Saved." : result.error);
    });
  }

  function notified() {
    start(async () => {
      const result = await markNotified(lead.id);
      setFailed(!result.ok);
      if (!result.ok) setMessage(result.error);
    });
  }

  const field =
    "border-rule focus:border-ink w-full border bg-white px-3 py-2 text-[0.9375rem] outline-none transition-colors";

  return (
    <div className="border-rule border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-baseline justify-between gap-4 px-4 py-3 text-left"
      >
        <span className="text-[0.9375rem]">
          {lead.name ?? <span className="text-muted-ink">No name given</span>}
          {lead.contact ? (
            <span className="text-muted-ink"> · {lead.contact}</span>
          ) : null}
        </span>
        <span className="text-muted-ink shrink-0 text-xs tabular-nums">
          {lead.targetBand ? `band ${lead.targetBand} · ` : ""}
          {/* Counted rather than printed: nobody reads a date and works out
              how long is left while deciding who to call first. */}
          {away === null
            ? LABEL[lead.status].toLowerCase()
            : away < 0
              ? "exam passed"
              : away === 0
                ? "exam today"
                : `${away}d to exam`}
        </span>
      </button>

      {open ? (
        <div className="border-rule flex flex-col gap-3 border-t p-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <Fact label="Contact" value={lead.contact} />
            <Fact
              label="Target band"
              value={lead.targetBand ? String(lead.targetBand) : null}
            />
            <Fact label="Exam date" value={lead.examDate} />
            <Fact
              label="Sat IELTS before"
              value={
                lead.takenBefore === null ? null : lead.takenBefore ? "Yes" : "No"
              }
            />
            <Fact
              label="Assessment"
              value={
                lead.placementStatus === "unknown"
                  ? null
                  : lead.placementStatus === "taken"
                    ? "Taken"
                    : "Not taken"
              }
            />
            <Fact label="Came from" value={lead.source} />
            <Fact
              label="First said"
              value={new Date(lead.createdAt).toLocaleDateString("en-GB")}
            />
          </dl>

          {lead.notifyOnLaunch ? (
            <div className="border-rule flex items-center gap-4 border-t pt-3">
              <span className="text-sm">
                Waiting to be told when the material is published.
              </span>
              {canEdit ? (
                <button
                  type="button"
                  onClick={notified}
                  disabled={pending}
                  className="text-muted-ink hover:text-ink ml-auto shrink-0 text-xs underline underline-offset-4 disabled:opacity-35"
                >
                  I have told them
                </button>
              ) : null}
            </div>
          ) : null}

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="What you learned by talking to them."
            disabled={!canEdit || pending}
            className={`${field} resize-y leading-[1.7]`}
          />

          {message ? (
            <p
              className={`text-sm ${failed ? "text-red-ink" : "text-confirm"}`}
              role="status"
            >
              {message}
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            {canEdit ? (
              <>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as LeadStatus)}
                  disabled={pending}
                  className={`${field} w-56 shrink-0`}
                >
                  {LEAD_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {LABEL[value]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={save}
                  disabled={pending || !dirty}
                  className="bg-ink shrink-0 px-4 py-2 text-[0.9375rem] text-white transition-opacity disabled:opacity-35"
                >
                  {pending ? "…" : "Save"}
                </button>
              </>
            ) : (
              <span className="text-muted-ink text-sm">{LABEL[lead.status]}</span>
            )}

            {lead.conversationId ? (
              <Link
                href={`/admin/conversations/${lead.conversationId}`}
                className="text-muted-ink hover:text-ink ml-auto text-sm underline underline-offset-4 transition-colors"
              >
                Read the conversation
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** A fact the person gave, or a plain admission that they did not. */
function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <>
      <dt className="text-muted-ink">{label}</dt>
      <dd>{value ?? <span className="text-muted-ink">—</span>}</dd>
    </>
  );
}
