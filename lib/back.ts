import { getProject } from "./projects";

export type BackTarget = { href: string; label: string };

/**
 * Where a page's ( Back ) leads, or null if the page has no way back.
 *
 * Only the pages you reach by going *into* something get one. Index, About and
 * Programs are what Menu opens onto — a Back on those would point at whatever
 * you happened to look at before, which is not a place the site knows about.
 * Everything under /work is nested, and /auth is a detour from an entry page.
 *
 * The answer is a destination rather than a boolean because history is not
 * good enough here: an entry page is reachable from its project page, from the
 * homepage links and from another entry's "Other Programs" row, and Back has
 * to name one place and mean it. `BackControl` still prefers a stored origin
 * when there is one — that is the sharper answer, and this is the floor.
 */
export function backTarget(pathname: string): BackTarget | null {
  const parts = pathname.split("/").filter(Boolean);

  if (parts[0] === "auth") return { href: "/services", label: "Programs" };

  if (parts[0] !== "work") return null;

  const project = parts[1] ? getProject(parts[1]) : undefined;
  if (!project) return null;

  // An entry goes back to its own project; a project goes back to the page
  // that lists all three.
  return parts[2]
    ? { href: `/work/${project.slug}`, label: project.name }
    : { href: "/services", label: "Programs" };
}
