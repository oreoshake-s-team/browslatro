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
