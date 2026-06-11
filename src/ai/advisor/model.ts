import Anthropic from "@anthropic-ai/sdk";
import { isAdvice, type Advice } from "./advice.js";
import type {
  AdviceRequest,
  BlindAdviceRequest,
  HandAdviceRequest,
  PackAdviceRequest,
  ShopAdviceRequest,
} from "./types";
import {
  BOSS_WIKI,
  retrieveJokerWikiEntries,
  retrieveShopWikiEntries,
  retrieveWikiEntries,
  type JokerRef,
  type WikiEntry,
} from "./wiki.js";

export type { Advice } from "./advice";

export type AdviceModelErrorCode =
  | "advisor_busy"
  | "model_timeout"
  | "model_refusal"
  | "invalid_player_key"
  | "model_error";

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
  "actions. Your job is to pick the best",
  "candidate by index, explain why in plain language, name the most tempting",
  "alternative and why it is worse, and tie the choice to one transferable concept.",
  "Never invent numbers: every chip, mult, score, or money figure you mention must",
  "appear verbatim in the provided data. Recommend the strongest candidate unless a",
  "marginally weaker one teaches a clearly more valuable lesson, and say so when you do.",
].join(" ");

function indexedCandidates(request: AdviceRequest): string {
  return JSON.stringify(
    request.candidates.map((candidate, index) => ({ index, ...candidate })),
  );
}

function shopJokerRefs(request: ShopAdviceRequest): ReadonlyArray<JokerRef> {
  const offered = request.candidates.flatMap((candidate) =>
    candidate.action === "buy" && candidate.item.itemType === "joker"
      ? [{ id: candidate.item.id, name: candidate.item.name }]
      : [],
  );
  return [...request.shop.jokers, ...offered];
}

function pushWikiLines(lines: string[], wiki: ReadonlyArray<{ title: string; text: string }>): void {
  if (wiki.length === 0) return;
  lines.push("Reference notes:");
  for (const entry of wiki) {
    lines.push(`- ${entry.title}: ${entry.text}`);
  }
}

function buildShopMessage(request: ShopAdviceRequest): string {
  const lines = [
    "The player is in the shop between rounds, deciding what to do with their money.",
    "Shop state:",
    JSON.stringify(request.shop),
  ];
  pushWikiLines(lines, retrieveShopWikiEntries(shopJokerRefs(request)));
  lines.push(
    "Candidate shop actions (choose by index):",
    indexedCandidates(request),
  );
  return lines.join("\n");
}

function packJokerRefs(request: PackAdviceRequest): ReadonlyArray<JokerRef> {
  const offered = request.candidates.flatMap((candidate) =>
    candidate.action === "pick" && candidate.option.optionType === "joker"
      ? [{ id: candidate.option.id, name: candidate.option.name }]
      : [],
  );
  return [...request.pack.jokers, ...offered];
}

function buildPackMessage(request: PackAdviceRequest): string {
  const lines = [
    "The player opened a booster pack and must pick an option or skip the remaining picks. The pack is already paid for; picking costs nothing extra.",
    "Pack state:",
    JSON.stringify(request.pack),
  ];
  pushWikiLines(lines, retrieveJokerWikiEntries(packJokerRefs(request)));
  lines.push(
    "Candidate pack actions (choose by index):",
    indexedCandidates(request),
  );
  return lines.join("\n");
}

function buildBlindMessage(request: BlindAdviceRequest): string {
  const lines = [
    "The player is on the blind selection screen, deciding whether to play the current blind or skip it for the offered tag. Skipping forfeits the blind's cash payout.",
    "Blind state (the upcoming boss and any other skippable blind's offer are included for planning):",
    JSON.stringify(request.blind),
  ];
  const wiki: WikiEntry[] = [...retrieveShopWikiEntries(request.blind.jokers)];
  const bossNote = BOSS_WIKI[request.blind.boss.id];
  if (bossNote !== undefined) {
    wiki.push({
      key: request.blind.boss.id,
      kind: "boss",
      title: request.blind.boss.name,
      text: bossNote,
    });
  }
  pushWikiLines(lines, wiki);
  lines.push(
    "Candidate blind actions (choose by index):",
    indexedCandidates(request),
  );
  return lines.join("\n");
}

function buildHandMessage(request: HandAdviceRequest): string {
  const lines = ["Game state:", JSON.stringify(request.state)];
  if (request.state.jokers.length > 0) {
    lines.push(
      "Joker order matters: jokers trigger left to right, in the order listed.",
    );
  }
  pushWikiLines(lines, retrieveWikiEntries(request.state));
  lines.push(
    "Candidate actions (choose by index):",
    indexedCandidates(request),
  );
  return lines.join("\n");
}

export function buildUserMessage(request: AdviceRequest): string {
  if (request.context === "shop") return buildShopMessage(request);
  if (request.context === "pack") return buildPackMessage(request);
  if (request.context === "blind") return buildBlindMessage(request);
  return buildHandMessage(request);
}

export function parseAdvice(text: string, candidateCount: number): Advice | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  return isAdvice(parsed, candidateCount) ? parsed : null;
}

export function mapModelError(error: unknown): AdviceModelResult {
  if (error instanceof Anthropic.RateLimitError) {
    return { ok: false, status: 503, code: "advisor_busy" };
  }
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return { ok: false, status: 504, code: "model_timeout" };
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return { ok: false, status: 401, code: "invalid_player_key" };
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
      model: process.env.ADVISOR_MODEL ?? MODEL_ID,
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
  if (response.stop_reason === "refusal") {
    return { ok: false, status: 502, code: "model_refusal" };
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
