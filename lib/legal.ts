/**
 * The facts both legal pages state, in one place.
 *
 * A privacy policy is only worth anything if it is true, and the fastest way
 * for one to stop being true is for the site to change and the document not to.
 * The contact details here are the same constants the footer uses, so a changed
 * address changes in both; the date is stated so a reader can tell whether what
 * they agreed to is what they are reading.
 *
 * Every processor listed below was read off the code rather than remembered —
 * `lib/account/mail.ts`, `lib/account/google.ts`, `lib/chatbot/db/client.ts`
 * and the two model providers. If one is dropped or added, this list moves with
 * it.
 */

/** Stated on both pages. Move it when the substance changes, not on every edit. */
export const LEGAL_UPDATED = "15 August 2026";

/**
 * Where someone asks for their data, or asks a question about it.
 *
 * Deliberately the same three routes Shabnam already answers on rather than a
 * new inbox nobody watches — a right you have to write to a dead address to
 * exercise is not a right.
 */
export const LEGAL_CONTACT = {
  telegram: "https://t.me/SHABNAMAHARI",
  linkedin: "https://www.linkedin.com/in/shabnam-ahari-372573101",
  email: "aharishabnaam@gmail.com",
} as const;

/** Who receives data, and what for. Read off the code, not recalled. */
export const PROCESSORS: { name: string; what: string }[] = [
  {
    name: "Supabase",
    what: "hosts the database, so everything described on this page is stored there",
  },
  { name: "Vercel", what: "hosts and serves the site itself" },
  { name: "Resend", what: "delivers the sign-in code to your inbox" },
  {
    name: "Google",
    what: "confirms your name and email address if you choose to sign in with it",
  },
  {
    name: "OpenRouter",
    what: "runs the language model that writes the assistant's replies, so the text of your questions is sent there",
  },
  {
    name: "Cohere",
    what: "turns text into the numbers the assistant searches with, so question text is sent there too",
  },
  {
    name: "Telegram",
    what: "carries the same assistant as a bot, and forwards messages when you ask for a person",
  },
];
