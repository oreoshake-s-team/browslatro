import Anthropic from "@anthropic-ai/sdk";
import type { AdviceRequest } from "./types";
import { retrieveWikiEntries } from "./wiki";

export interface Advice {
  readonly recommendationIndex: number;
  readonly alternativeIndex: number;
  readonly whyAlternativeWorse: string;
  readonly explanation: string;
  readonly concept: string;
}

export type AdviceModelErrorCode = "advisor_busy" | "model_timeout" | "model_error";

export type AdviceModelResult =
  | { readonly ok: true; readonly advice: Advice }
  | {
      readonly ok: false;
      readonly status: number;
      readonly code: AdviceModelErrorCode;
    };

export const MODEL_ID = "claude-opus-4-8";
export const MODEL_TIMEOUT_MS = 25_000;
export const MAX_OUTPUT_TOKENS = 16_000;

export const ADVICE_SCHEMA = {
  type: "object",
  properties: {
    recommendationIndex: { type: "integer" },
    alternativeIndex: { type: "integer" },
    whyAlternativeWorse: { type: "string" },
    explanation: { type: "string" },
    concept: { type: "string" },
  },
  required: [
    "recommendationIndex",
    "alternativeIndex",
    "whyAlternativeWorse",
    "explanation",
    "concept",
  ],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = [
  "You are an educational Balatro coach. The player sees engine-vetted candidate",
  "actions, each already scored by the game engine. Your job is to pick the best",
  "candidate by index, explain why in plain language, name the most tempting",
  "alternative and why it is worse, and tie the choice to one transferable concept.",
  "Never invent numbers: every chip, mult, score, or money figure you mention must",
  "appear verbatim in the provided data. Recommend the strongest candidate unless a",
  "marginally weaker one teaches a clearly more valuable lesson, and say so when you do.",
].join(" ");

export function buildUserMessage(request: AdviceRequest): string {
  const candidates = request.candidates.map((candidate, index) => ({
    index,
    ...candidate,
  }));
  const lines = ["Game state:", JSON.stringify(request.state)];
  if (request.state.jokers.length > 0) {
    lines.push(
      "Joker order matters: jokers trigger left to right, in the order listed.",
    );
  }
  const wiki = retrieveWikiEntries(request.state);
  if (wiki.length > 0) {
    lines.push("Reference notes:");
    for (const entry of wiki) {
      lines.push(`- ${entry.title}: ${entry.text}`);
    }
  }
  lines.push("Candidate actions (choose by index):", JSON.stringify(candidates));
  return lines.join("\n");
}

export function parseAdvice(text: string, candidateCount: number): Advice | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const advice = parsed as Advice;
  const validIndex = (value: number): boolean =>
    Number.isInteger(value) && value >= 0 && value < candidateCount;
  if (!validIndex(advice.recommendationIndex)) return null;
  if (!validIndex(advice.alternativeIndex)) return null;
  if (advice.alternativeIndex === advice.recommendationIndex) return null;
  if (typeof advice.whyAlternativeWorse !== "string") return null;
  if (typeof advice.explanation !== "string") return null;
  if (typeof advice.concept !== "string") return null;
  return advice;
}

export function mapModelError(error: unknown): AdviceModelResult {
  if (error instanceof Anthropic.RateLimitError) {
    return { ok: false, status: 503, code: "advisor_busy" };
  }
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return { ok: false, status: 504, code: "model_timeout" };
  }
  return { ok: false, status: 502, code: "model_error" };
}

export async function requestAdvice(
  request: AdviceRequest,
  apiKey: string,
): Promise<AdviceModelResult> {
  const client = new Anthropic({
    apiKey,
    timeout: MODEL_TIMEOUT_MS,
    maxRetries: 0,
  });
  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: MODEL_ID,
      max_tokens: MAX_OUTPUT_TOKENS,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: ADVICE_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage(request) }],
    });
  } catch (error) {
    return mapModelError(error);
  }
  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  const advice = parseAdvice(text, request.candidates.length);
  if (advice === null) {
    return { ok: false, status: 502, code: "model_error" };
  }
  return { ok: true, advice };
}
