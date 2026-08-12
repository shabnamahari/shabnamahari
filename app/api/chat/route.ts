import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

import { converse } from "@/lib/chatbot/core/converse";
import type { Lang } from "@/lib/chatbot/core/types";

/**
 * The web channel's doorway, and nothing more.
 *
 * Every decision about what to say — which language, what was retrieved, when
 * to call a tool, which model answered — belongs to `converse()`. This file
 * turns an HTTP request into a `ConverseInput` and turns the events back into
 * server-sent events. If conversation logic ever appears here, the brain is
 * incomplete and the widget and Telegram will need the same logic written a
 * second and third time.
 */

/** The cookie that makes someone the same person across visits and channels. */
const UID_COOKIE = "sc_uid";
const UID_MAX_AGE = 60 * 60 * 24 * 365;

type Body = {
  text?: unknown;
  conversationId?: unknown;
  forceLang?: unknown;
};

function badRequest(message: string): Response {
  return Response.json({ error: message }, { status: 400 });
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return badRequest("Body must be JSON.");
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return badRequest("`text` is required.");
  // A ceiling, not a validation rule. Anything longer than this is a paste, and
  // the one paste this assistant reliably gets is an essay someone wants marked
  // — which it declines anyway, after paying to embed the whole thing.
  if (text.length > 4000) return badRequest("`text` is too long.");

  const conversationId =
    typeof body.conversationId === "string" && body.conversationId
      ? body.conversationId
      : undefined;

  const forceLang: Lang | undefined =
    body.forceLang === "en" || body.forceLang === "fa" ? body.forceLang : undefined;

  const existingUid = request.cookies.get(UID_COOKIE)?.value;
  const uid = existingUid ?? randomUUID();

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        for await (const event of converse({
          channel: "web",
          externalUserId: uid,
          text,
          conversationId,
          forceLang,
        })) {
          send(event);
        }
      } catch (error) {
        // The generator throwing is different from it yielding an `error`
        // event: that one is a turn the brain handled and reported, this one is
        // a turn it could not finish. The reader is told either way, because a
        // stream that simply stops looks to the page exactly like a slow model.
        send({
          type: "error",
          message: error instanceof Error ? error.message : "The answer could not be produced.",
        });
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  const headers = new Headers({
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    // Nginx and some CDNs buffer proxied responses by default, which turns a
    // token-by-token stream into one long pause and then the whole answer.
    "x-accel-buffering": "no",
  });

  if (!existingUid) {
    headers.append(
      "set-cookie",
      `${UID_COOKIE}=${uid}; Path=/; Max-Age=${UID_MAX_AGE}; HttpOnly; SameSite=Lax${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`,
    );
  }

  return new Response(stream, { headers });
}
