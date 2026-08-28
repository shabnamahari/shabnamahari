import { getProject } from "./projects";
import { LEARN, learnHref } from "./routes";

export type BackTarget = { href: string; label: string };

/**
 * What the Learn section is called to a visitor.
 *
 * Its heading is "This is what you learn" and the menu calls it Learn, so Back
 * has to as well. Naming it "Programs" here — which is what the page's title
 * tag used to say — promised a page by that name that does not exist. The
 * address now agrees with both.
 */
const LEARN_LABEL = "Learn";

/**
 * Where a page's ( Back ) leads, or null if the page has no way back.
 *
 * Only the pages you reach by going *into* something get one. Home, About and
 * Programs are what Menu opens onto — a Back on those would point at whatever
 * you happened to look at before, which is not a place the site knows about.
 * Everything under /learn is nested, and /auth is a detour from an entry page.
 *
 * The answer is a destination rather than a boolean because history is not
 * good enough here: an entry page is reachable from its project page, from the
 * homepage links and from another entry's "Other Programs" row, and Back has
 * to name one place and mean it. `BackControl` still prefers a stored origin
 * when there is one — that is the sharper answer, and this is the floor.
 */
export function backTarget(pathname: string): BackTarget | null {
  const parts = pathname.split("/").filter(Boolean);

  if (parts[0] === "auth") return { href: LEARN, label: LEARN_LABEL };

  /*
   * The account page, which is reached by signing in rather than by browsing
   * into anything — so there is no page "above" it in the way there is above a
   * lesson. Home, because that is where signing in starts, and because a page
   * whose only exit is Sign out is a room with the door locked behind you.
   */
  if (parts[0] === "myaccount") return { href: "/", label: "Home" };

  // `LEARN` is "/learn", so its first segment is what a nested page begins
  // with. Compared against the constant rather than a literal, so renaming the
  // section again cannot leave this test looking for the old name.
  if (`/${parts[0]}` !== LEARN) return null;

  const project = parts[1] ? getProject(parts[1]) : undefined;
  if (!project) return null;

  // An entry goes back to its own project; a project goes back to the page
  // that lists all three.
  return parts[2]
    ? { href: learnHref(project.slug), label: project.name }
    : { href: LEARN, label: LEARN_LABEL };
}
