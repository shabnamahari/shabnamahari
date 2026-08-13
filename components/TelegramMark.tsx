/**
 * The Telegram paper plane, drawn rather than fetched.
 *
 * An inline path costs nothing, takes the colour of whatever it sits in, and
 * cannot fail to load — which matters here because it sits on the assistant's
 * black glass and a broken image would be a hole in it. It is also the only
 * third-party mark on the site, so it is kept to the shape alone: no brand blue,
 * no circle, nothing that reads as someone else's badge on Shabnam's page.
 */
export default function TelegramMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      focusable="false"
      className={className}
    >
      <path d="M21.94 4.3 18.9 19.1c-.23 1.02-.84 1.27-1.7.79l-4.7-3.47-2.27 2.19c-.25.25-.46.46-.95.46l.34-4.8 8.72-7.88c.38-.34-.08-.53-.59-.19L6.98 13.1l-4.64-1.45c-1.01-.32-1.03-1.01.21-1.5l18.14-6.99c.84-.31 1.58.2 1.25 3.14Z" />
    </svg>
  );
}
