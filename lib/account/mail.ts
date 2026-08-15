import "server-only";

/**
 * Sending the code, through Resend.
 *
 * One function and one fetch, rather than the SDK. The SDK is a dependency to
 * install, audit and keep current in exchange for wrapping a single POST with
 * a bearer token, and the shape of that POST is the part least likely to
 * change. Swapping provider means rewriting the body inside `send` — which is
 * the reason everything above it speaks in `to` and `code` and knows nothing
 * about Resend at all.
 *
 * Failure is loud here, deliberately. A code that is generated, stored and
 * never sent leaves someone staring at a form waiting for an email that is not
 * coming, and the only thing worse than telling them it failed is not telling
 * them.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

/**
 * The address the code arrives from.
 *
 * Resend will send from `onboarding@resend.dev` with no domain set up at all,
 * which is what makes it possible to test this today. It is not what should be
 * on a real email: it says nothing about who is writing, and a code from an
 * address the reader has never heard of is a code that looks like phishing. The
 * day the domain is verified this becomes something at shabnamahari.com and
 * nothing else changes.
 */
function from(): string {
  return process.env.AUTH_EMAIL_FROM?.trim() || "onboarding@resend.dev";
}

/**
 * The message itself.
 *
 * Plain, short, and it says what to do with the number and what to do if it was
 * not asked for. No layout, no logo: an email that exists to carry six digits
 * should be readable in the notification without being opened.
 */
function body(code: string): { subject: string; text: string; html: string } {
  const subject = `${code} — your sign-in code`;
  const text = [
    `Your code is ${code}`,
    "",
    "Type it into the sign-up box to finish signing in. It lasts ten minutes.",
    "",
    "If you did not ask for this, you can ignore this email — nothing has been created.",
  ].join("\n");

  const html = [
    `<p style="font:16px/1.6 system-ui,sans-serif">Your code is</p>`,
    `<p style="font:600 32px/1.2 system-ui,sans-serif;letter-spacing:.12em">${code}</p>`,
    `<p style="font:16px/1.6 system-ui,sans-serif">Type it into the sign-up box to finish signing in. It lasts ten minutes.</p>`,
    `<p style="font:14px/1.6 system-ui,sans-serif;color:#6b6864">If you did not ask for this, you can ignore this email — nothing has been created.</p>`,
  ].join("");

  return { subject, text, html };
}

export async function sendCodeEmail(to: string, code: string): Promise<void> {
  const { subject, text, html } = body(code);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${required("RESEND_API_KEY")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ from: from(), to: [to], subject, text, html }),
  });

  if (!res.ok) {
    // The provider's own message, kept: "domain is not verified" and "invalid
    // api key" are different problems with different fixes, and collapsing them
    // into "could not send" costs an afternoon.
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend refused the message (${res.status}): ${detail}`);
  }
}
