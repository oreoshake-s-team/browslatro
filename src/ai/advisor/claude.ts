import Anthropic from "@anthropic-ai/sdk";
import {
  ADVICE_SCHEMA,
  ADVISOR_SYSTEM_PROMPT,
  buildAdvicePrompt,
} from "./prompt";
import type { AdviceRequest } from "./types";

export const DEFAULT_ADVISOR_MODEL = "claude-opus-4-8";

export type ClaudeAdviceResult =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "refusal" };

export async function requestAdviceText(
  request: AdviceRequest,
  apiKey: string,
): Promise<ClaudeAdviceResult> {
  const client = new Anthropic({ apiKey, timeout: 25_000, maxRetries: 0 });
  const response = await client.messages.create({
    model: process.env.ADVISOR_MODEL ?? DEFAULT_ADVISOR_MODEL,
    max_tokens: 16_000,
    thinking: { type: "adaptive" },
    system: ADVISOR_SYSTEM_PROMPT,
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: ADVICE_SCHEMA },
    },
    messages: [{ role: "user", content: buildAdvicePrompt(request) }],
  });
  if (response.stop_reason === "refusal") return { kind: "refusal" };
  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
  return { kind: "text", text };
}
