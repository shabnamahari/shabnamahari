import "server-only";

import { db } from "@/lib/chatbot/db/client";
import { galleryItems, getProject } from "@/lib/projects";
import { learnHref } from "@/lib/routes";

/**
 * The courses an account is on, as things that can be linked to.
 *
 * The table stores slugs — the same two segments the URLs carry — and the
 * catalogue they name lives in `lib/projects.ts`. So the title is resolved here
 * rather than stored: a Program renamed on the site is renamed on everybody's
 * account page at the same moment, where a copied title would have gone on
 * saying the old name until someone noticed.
 */

export type Enrolment = {
  /** What it is called on the site. */
  title: string;
  /** Where it lives, built by `learnHref` like every other link to Learn. */
  href: string;
  /** The Program it belongs to, when the row names an entry inside one. */
  program?: string;
};

export async function enrolmentsFor(accountId: string): Promise<Enrolment[]> {
  const { data, error } = await db()
    .from("enrolments")
    .select("program, entry")
    .eq("account_id", accountId)
    .order("enrolled_at", { ascending: false });

  if (error) {
    // A page that cannot reach the database should say it has no courses to
    // show, not fail to render. The panel's empty state is the honest thing to
    // put here, and the error belongs in the log where Shabnam can see it.
    console.error("[account] could not read enrolments:", error);
    return [];
  }

  return (data ?? [])
    .map(({ program, entry }) => resolve(program, entry))
    .filter((course): course is Enrolment => course !== null);
}

/**
 * One row, turned into a title and an address — or nothing.
 *
 * Nothing, rather than a best guess, when the slugs do not name anything on the
 * site. The guess would be a link to a page that does not exist, sitting on a
 * page that is meant to be the reader's own record of what they are on; a
 * missing line is the smaller lie, and the row is still in the table for
 * whoever comes to fix the slug.
 */
function resolve(program: string, entry: string | null): Enrolment | null {
  const project = getProject(program);
  if (!project) return null;

  if (!entry) return { title: project.name, href: learnHref(program) };

  const entries = galleryItems(program);
  const index = entries.findIndex((item) => item.slug === entry);
  if (index === -1) return null;

  return {
    title: project.galleryLabels?.[index]?.title ?? entries[index].slug,
    href: entries[index].href,
    program: project.name,
  };
}
