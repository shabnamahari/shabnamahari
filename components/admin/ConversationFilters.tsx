/**
 * Searching and narrowing the conversation list.
 *
 * A plain GET form, no client component and no JavaScript. The state lands in
 * the URL, which means the back button works, a search can be kept in a tab or
 * sent to someone, and a page that is already a server component stays one.
 *
 * Search is also how you reach anything older than the sixty most recent. A
 * "load more" would be the obvious answer and the wrong one: nobody scrolls
 * through four hundred conversations looking for the person who asked about
 * refunds, they type "refund".
 */
export default function ConversationFilters({
  q,
  channel,
  lang,
}: {
  q: string;
  channel: string;
  lang: string;
}) {
  const field =
    "border-rule focus:border-ink border bg-white px-3 py-2 text-[0.9375rem] outline-none transition-colors";

  return (
    <form method="get" className="mt-8 flex flex-wrap items-center gap-3">
      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder="Search what was said"
        className={`${field} min-w-0 flex-1`}
      />

      <select name="channel" defaultValue={channel} className={`${field} w-36 shrink-0`}>
        <option value="">Any channel</option>
        <option value="web">Web</option>
        <option value="telegram">Telegram</option>
        <option value="widget">Widget</option>
      </select>

      <select name="lang" defaultValue={lang} className={`${field} w-36 shrink-0`}>
        <option value="">Any language</option>
        <option value="en">English</option>
        <option value="fa">فارسی</option>
      </select>

      <button
        type="submit"
        className="bg-ink shrink-0 px-4 py-2 text-[0.9375rem] text-white"
      >
        Search
      </button>

      {/* Only when something is set, because a "clear" that clears nothing is a
          button that does nothing. A link rather than a reset, so it returns to
          the unfiltered page rather than to the last submitted values. */}
      {q || channel || lang ? (
        <a
          href="/admin/conversations"
          className="text-muted-ink hover:text-ink shrink-0 text-sm underline underline-offset-4 transition-colors"
        >
          Clear
        </a>
      ) : null}
    </form>
  );
}
