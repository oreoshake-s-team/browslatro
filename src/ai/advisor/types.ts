import type { HandOption } from "../getHandOptions";
import type { ModelState } from "../modelState";

export const MAX_CANDIDATES = 12;
export const MAX_HAND_CARDS = 16;
export const MAX_JOKERS = 16;
export const MAX_CANDIDATE_CARDS = 5;

export interface AdviceRequest {
  readonly state: ModelState;
  readonly candidates: ReadonlyArray<HandOption>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isCardIdArray(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length >= 1 &&
    value.length <= MAX_CANDIDATE_CARDS &&
    value.every(isFiniteNumber)
  );
}

function isCandidate(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (!isCardIdArray(value.cardIds)) return false;
  if (value.action === "discard") return true;
  if (value.action !== "play") return false;
  return (
    typeof value.handLabel === "string" &&
    isFiniteNumber(value.score) &&
    isFiniteNumber(value.chips) &&
    isFiniteNumber(value.mult)
  );
}

function isModelState(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (
    !Array.isArray(value.hand) ||
    value.hand.length < 1 ||
    value.hand.length > MAX_HAND_CARDS ||
    !value.hand.every(isRecord)
  ) {
    return false;
  }
  if (
    !Array.isArray(value.jokers) ||
    value.jokers.length > MAX_JOKERS ||
    !value.jokers.every(isRecord)
  ) {
    return false;
  }
  if (
    !isRecord(value.blind) ||
    typeof value.blind.name !== "string" ||
    !isFiniteNumber(value.blind.scoreTarget)
  ) {
    return false;
  }
  return (
    isFiniteNumber(value.money) &&
    isFiniteNumber(value.remainingHands) &&
    isFiniteNumber(value.remainingDiscards) &&
    isFiniteNumber(value.roundScore)
  );
}

export function parseAdviceRequest(body: unknown): AdviceRequest | null {
  if (!isRecord(body)) return null;
  if (!isModelState(body.state)) return null;
  if (!Array.isArray(body.candidates)) return null;
  if (body.candidates.length === 0 || body.candidates.length > MAX_CANDIDATES) {
    return null;
  }
  if (!body.candidates.every(isCandidate)) return null;
  return body as unknown as AdviceRequest;
}
