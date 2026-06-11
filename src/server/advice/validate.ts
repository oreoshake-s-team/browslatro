import type { HandOption } from "../../ai/getHandOptions";
import type { ModelState } from "../../ai/modelState";

export interface AdviceRequest {
  readonly state: ModelState;
  readonly options: ReadonlyArray<HandOption>;
}

export type ParseResult =
  | { readonly ok: true; readonly value: AdviceRequest }
  | { readonly ok: false; readonly error: string };

export const MAX_HAND_CARDS = 16;
export const MAX_JOKERS = 16;
export const MAX_OPTIONS = 12;
export const MAX_OPTION_CARDS = 5;

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
    value.length <= MAX_OPTION_CARDS &&
    value.every(isFiniteNumber)
  );
}

function isHandOption(value: unknown): boolean {
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

export function parseAdviceRequest(body: unknown): ParseResult {
  if (!isRecord(body)) {
    return { ok: false, error: "body must be a JSON object" };
  }
  if (!isModelState(body.state)) {
    return { ok: false, error: "state does not match the ModelState contract" };
  }
  if (
    !Array.isArray(body.options) ||
    body.options.length < 1 ||
    body.options.length > MAX_OPTIONS
  ) {
    return { ok: false, error: `options must contain 1-${MAX_OPTIONS} entries` };
  }
  if (!body.options.every(isHandOption)) {
    return { ok: false, error: "options do not match the HandOption contract" };
  }
  return {
    ok: true,
    value: {
      state: body.state as unknown as ModelState,
      options: body.options as unknown as ReadonlyArray<HandOption>,
    },
  };
}
