import type { AdviceRequest } from "./types";

export const ADVISOR_SYSTEM_PROMPT = [
  "You are a friendly Balatro coach helping the player learn to evaluate hands for themselves.",
  "The game engine has already enumerated and scored every candidate action you receive; it is the only source of truth.",
  "Every number you cite must appear verbatim in the provided data. Never invent or recompute figures.",
  "Recommend the strongest candidate unless a slightly weaker one teaches a more transferable lesson.",
  "When a tempting but worse candidate exists, name it and say why it loses.",
  "Keep the explanation under 120 words and tie it to one reusable concept.",
].join(" ");

export function buildAdvicePrompt(request: AdviceRequest): string {
  return [
    "Game state:",
    JSON.stringify(request.state),
    "Candidate actions, indexed from zero:",
    JSON.stringify(request.candidates),
  ].join("\n");
}

export const ADVICE_SCHEMA = {
  type: "object",
  properties: {
    recommendationIndex: { type: "integer" },
    alternativeIndex: { type: ["integer", "null"] },
    whyAlternativeWorse: { type: ["string", "null"] },
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
};
