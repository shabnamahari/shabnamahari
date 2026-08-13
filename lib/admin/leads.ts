/**
 * Where a lead sits in the one funnel this brand has, and what to call it.
 *
 * A plain module rather than part of the server actions beside it. Everything
 * exported from a `"use server"` file becomes a server reference — a stub the
 * browser can call, not a value it can read — so a constant array declared
 * there arrives in the client as something that cannot be mapped over. That
 * shipped: the row rendered closed and threw the instant it was opened, at the
 * `<select>` that lists these.
 *
 * The labels live here with the values for the same reason the values live in
 * one place at all: a list of statuses and a list of their names, kept apart,
 * drift the first time one is added.
 */

export type LeadStatus =
  | "new"
  | "contacted"
  | "placement_taken"
  | "enrolled"
  | "lost";

export const LEAD_STATUSES: readonly LeadStatus[] = [
  "new",
  "contacted",
  "placement_taken",
  "enrolled",
  "lost",
];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  placement_taken: "Took the assessment",
  enrolled: "Enrolled",
  lost: "Lost",
};
