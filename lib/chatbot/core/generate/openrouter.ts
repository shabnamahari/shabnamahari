import "server-only";

export type ToolCall = {
  id: string;
  name: string;
  /** Raw JSON from the model. Parsed by the tool, which owns its own schema. */
  arguments: string;
};

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string; tool_calls?: ToolCall[] }
  | { role: "tool"; content: string; tool_call_id: string };

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

/** OpenRouter speaks the OpenAI shape, which nests differently from ours. */
function toWireMessage(message: ChatMessage): Record<string, unknown> {
  if (message.role === "tool") {
    return {
      role: "tool",
      content: message.content,
      tool_call_id: message.tool_call_id,
    };
  }
  if (message.role === "assistant" && message.tool_calls?.length) {
    return {
      role: "assistant",
      content: message.content || null,
      tool_calls: message.tool_calls.map((call) => ({
        id: call.id,
        type: "function",
        function: { name: call.name, arguments: call.arguments },
      })),
    };
  }
  return { role: message.role, content: message.content };
}

function toWireTools(tools: ToolDefinition[]): Record<string, unknown>[] {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

export type Usage = {
  tokensIn: number;
  tokensOut: number;
  /** USD for this call, as reported by OpenRouter rather than computed here. */
  costUsd: number;
};

export type CompletionOptions = {
  model: string;
  messages: ChatMessage[];
  maxTokens: number;
  temperature?: number | null;
  topP?: number | null;
  tools?: ToolDefinition[];
  signal?: AbortSignal;
};

function baseUrl(): string {
  return process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
}

function headers(): Record<string, string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set.");
  return {
    Authorization: `Bearer ${key}`,
    "content-type": "application/json",
    // Attribution, so usage is legible in the OpenRouter dashboard rather than
    // arriving as one anonymous lump.
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
    "X-Title": process.env.OPENROUTER_APP_NAME ?? "Sir Cue",
  };
}

/**
 * Several current models reject sampling parameters outright, so they are only
 * sent when the panel has actually set them. A null in the database means
 * "don't send it", not "send zero".
 */
function sampling(options: CompletionOptions): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (options.temperature !== null && options.temperature !== undefined) {
    out.temperature = options.temperature;
  }
  if (options.topP !== null && options.topP !== undefined) {
    out.top_p = options.topP;
  }
  return out;
}

/** A whole answer at once. Used for short internal calls — query translation,
 *  conversation summarisation — never for anything a person waits on. */
export async function complete(
  options: CompletionOptions,
): Promise<{ text: string; usage: Usage }> {
  const res = await fetch(`${baseUrl()}/chat/completions`, {
    method: "POST",
    headers: headers(),
    signal: options.signal,
    body: JSON.stringify({
      model: options.model,
      messages: options.messages.map(toWireMessage),
      max_tokens: options.maxTokens,
      usage: { include: true },
      ...sampling(options),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new OpenRouterError(res.status, detail, options.model);
  }

  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
  };

  return {
    text: body.choices?.[0]?.message?.content ?? "",
    usage: {
      tokensIn: body.usage?.prompt_tokens ?? 0,
      tokensOut: body.usage?.completion_tokens ?? 0,
      costUsd: body.usage?.cost ?? 0,
    },
  };
}

export type StreamChunk =
  | { type: "delta"; text: string }
  | { type: "tool_calls"; calls: ToolCall[] }
  | { type: "usage"; usage: Usage };

/**
 * Reassembles tool calls that arrive split across frames.
 *
 * A streamed tool call is delivered a few characters at a time — the name in
 * one frame, the arguments JSON over many more — keyed by an index rather than
 * by id. Accumulating by index and only emitting once the stream ends is what
 * turns that back into something callable.
 */
class ToolCallAccumulator {
  private readonly byIndex = new Map<number, { id: string; name: string; args: string }>();

  add(delta: {
    index?: number;
    id?: string;
    function?: { name?: string; arguments?: string };
  }) {
    const index = delta.index ?? 0;
    const existing = this.byIndex.get(index) ?? { id: "", name: "", args: "" };

    if (delta.id) existing.id = delta.id;
    if (delta.function?.name) existing.name = delta.function.name;
    if (delta.function?.arguments) existing.args += delta.function.arguments;

    this.byIndex.set(index, existing);
  }

  get calls(): ToolCall[] {
    return [...this.byIndex.values()]
      .filter((call) => call.name)
      .map((call) => ({
        // Some providers omit the id on streamed calls. The id only has to be
        // unique within the turn, because it is what pairs the result back to
        // the call.
        id: call.id || `call_${call.name}`,
        name: call.name,
        arguments: call.args || "{}",
      }));
  }
}

/**
 * Streams an answer token by token.
 *
 * Usage arrives in the final SSE frame rather than up front, which is why this
 * yields two shapes: the caller renders every `delta` as it lands and records
 * the single `usage` at the end.
 */
export async function* stream(
  options: CompletionOptions,
): AsyncGenerator<StreamChunk> {
  const res = await fetch(`${baseUrl()}/chat/completions`, {
    method: "POST",
    headers: headers(),
    signal: options.signal,
    body: JSON.stringify({
      model: options.model,
      messages: options.messages.map(toWireMessage),
      max_tokens: options.maxTokens,
      stream: true,
      usage: { include: true },
      ...(options.tools?.length ? { tools: toWireTools(options.tools) } : {}),
      ...sampling(options),
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new OpenRouterError(res.status, detail, options.model);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const toolCalls = new ToolCallAccumulator();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line. Anything after the last one
      // is a partial frame and stays in the buffer for the next read.
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "" || payload === "[DONE]") continue;

          let parsed: {
            choices?: {
              delta?: {
                content?: string;
                tool_calls?: {
                  index?: number;
                  id?: string;
                  function?: { name?: string; arguments?: string };
                }[];
              };
            }[];
            usage?: {
              prompt_tokens?: number;
              completion_tokens?: number;
              cost?: number;
            };
          };
          try {
            parsed = JSON.parse(payload);
          } catch {
            // OpenRouter sends `: OPENROUTER PROCESSING` keep-alive comments
            // and the occasional non-JSON line. Skipping them is correct;
            // failing the stream over one is not.
            continue;
          }

          const delta = parsed.choices?.[0]?.delta;

          const text = delta?.content;
          if (text) yield { type: "delta", text };

          for (const call of delta?.tool_calls ?? []) toolCalls.add(call);

          if (parsed.usage) {
            yield {
              type: "usage",
              usage: {
                tokensIn: parsed.usage.prompt_tokens ?? 0,
                tokensOut: parsed.usage.completion_tokens ?? 0,
                costUsd: parsed.usage.cost ?? 0,
              },
            };
          }
        }
      }
    }
    // Emitted once the stream is complete, because a tool call is only
    // callable when its arguments JSON has finished arriving.
    const calls = toolCalls.calls;
    if (calls.length > 0) yield { type: "tool_calls", calls };
  } finally {
    // Releasing the lock matters on the abort path: without it a cancelled
    // request leaves the connection held until GC.
    reader.releaseLock();
  }
}

export class OpenRouterError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
    readonly model: string,
  ) {
    super(`OpenRouter rejected ${model}: HTTP ${status} ${detail.slice(0, 200)}`);
    this.name = "OpenRouterError";
  }

  /**
   * Whether trying the fallback model is likely to help.
   *
   * A malformed request fails identically on any model, so retrying it just
   * spends money twice. Rate limits, provider outages and credit problems are
   * specific to the model or account path being used, and those are exactly
   * what the fallback exists for.
   */
  get shouldFallback(): boolean {
    return this.status === 402 || this.status === 429 || this.status >= 500;
  }
}
