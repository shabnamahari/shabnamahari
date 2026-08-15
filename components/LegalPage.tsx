import type { ReactNode } from "react";

/**
 * The shape both legal pages take.
 *
 * They are the only pages on this site whose job is to be read closely rather
 * than to make an impression, so they get a single narrow column, generous
 * leading, and none of the site's motion. Nothing here reveals on scroll: a
 * document someone has been told they agreed to should not make them wait to
 * read it.
 *
 * Shared so the two cannot drift the way the sign-up panels did — one change to
 * the reading measure, not two.
 */

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  /** Stated on the page, because a policy with no date is a policy you cannot tell has changed. */
  updated: string;
  children: ReactNode;
}) {
  return (
    <section className="px-[15px] py-[140px]">
      <div className="mx-auto w-full max-w-[46rem]">
        <h1 className="text-h2">{title}</h1>
        <p className="text-note text-muted-ink mt-4">Last updated {updated}</p>
        <div className="mt-16 flex flex-col gap-y-12">{children}</div>
      </div>
    </section>
  );
}

export function Section({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-y-4">
      <h2 className="text-h3">{heading}</h2>
      {children}
    </div>
  );
}

/** Body copy, at a size and leading meant for paragraphs rather than headlines. */
export function P({ children }: { children: ReactNode }) {
  return <p className="text-[1.0625rem] leading-[1.7]">{children}</p>;
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-y-3 pl-5">
      {items.map((item, i) => (
        <li key={i} className="list-disc text-[1.0625rem] leading-[1.7]">
          {item}
        </li>
      ))}
    </ul>
  );
}
