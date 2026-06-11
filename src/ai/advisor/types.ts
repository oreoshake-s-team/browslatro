import type { HandOption } from "../getHandOptions";
import type { ModelState } from "../modelState";

export const MAX_CANDIDATES = 12;

export interface AdviceRequest {
  readonly state: ModelState;
  readonly candidates: ReadonlyArray<HandOption>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCandidate(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.action !== "play" && value.action !== "discard") return false;
  if (!Array.isArray(value.cardIds)) return false;
  return value.cardIds.every((id) => typeof id === "number");
}

export function parseAdviceRequest(body: unknown): AdviceRequest | null {
  if (!isRecord(body)) return null;
  if (!isRecord(body.state)) return null;
  if (!Array.isArray(body.candidates)) return null;
  if (body.candidates.length === 0 || body.candidates.length > MAX_CANDIDATES) {
    return null;
  }
  if (!body.candidates.every(isCandidate)) return null;
  return body as unknown as AdviceRequest;
}

export interface Advice {
  readonly recommendationIndex: number;
  readonly alternativeIndex: number | null;
  readonly whyAlternativeWorse: string | null;
  readonly explanation: string;
  readonly concept: string;
}

function isIndex(value: unknown, count: number): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < count
  );
}

export function parseAdvice(
  value: unknown,
  candidateCount: number,
): Advice | null {
  if (!isRecord(value)) return null;
  const altOk =
    value.alternativeIndex === null ||
    isIndex(value.alternativeIndex, candidateCount);
  const whyOk =
    value.whyAlternativeWorse === null ||
    typeof value.whyAlternativeWorse === "string";
  const ok =
    isIndex(value.recommendationIndex, candidateCount) &&
    altOk &&
    whyOk &&
    typeof value.explanation === "string" &&
    typeof value.concept === "string";
  return ok ? (value as unknown as Advice) : null;
}
