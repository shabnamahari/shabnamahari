import "server-only";

import type { ToolDefinition } from "../generate/openrouter";
import type { Lang } from "../types";

/**
 * Tools the model can call.
 *
 * A tool exists here rather than as an instruction in the prompt whenever the
 * bot has to *do* something rather than say something. Asking the model to
 * "remember their phone number" gets you a model that says it will; a tool call
 * gets you a row.
 */

export type ToolContext = {
  conversationId: string;
  channel: "web" | "widget" | "telegram";
  lang: Lang;
};

export type Tool = {
  definition: ToolDefinition;
  /** Returns what the model sees as the result — short, and in English, since
   *  it is read by the model rather than by the person. */
  run(args: Record<string, unknown>, context: ToolContext): Promise<string>;
};

import { captureLead } from "./capture-lead";

const REGISTRY: Tool[] = [captureLead];

export function toolDefinitions(): ToolDefinition[] {
  return REGISTRY.map((tool) => tool.definition);
}

export async function runTool(
  name: string,
  rawArguments: string,
  context: ToolContext,
): Promise<string> {
  const tool = REGISTRY.find((t) => t.definition.name === name);
  if (!tool) return `No tool named "${name}".`;

  let args: Record<string, unknown>;
  try {
    args = JSON.parse(rawArguments || "{}");
  } catch {
    // Models do occasionally emit malformed JSON. Telling the model that,
    // rather than throwing, lets it correct itself on the next turn instead of
    // failing the whole answer.
    return "Those arguments were not valid JSON. Try the call again.";
  }

  try {
    return await tool.run(args, context);
  } catch (error) {
    return `The tool failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}
