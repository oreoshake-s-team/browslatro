export interface Advice {
  readonly recommendationIndex: number;
  readonly alternativeIndex: number;
  readonly whyAlternativeWorse: string;
  readonly explanation: string;
  readonly concept: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isAdvice(value: unknown, candidateCount: number): value is Advice {
  if (!isRecord(value)) return false;
  const validIndex = (candidate: unknown): candidate is number =>
    typeof candidate === "number" &&
    Number.isInteger(candidate) &&
    candidate >= 0 &&
    candidate < candidateCount;
  if (!validIndex(value.recommendationIndex)) return false;
  if (!validIndex(value.alternativeIndex)) return false;
  if (value.alternativeIndex === value.recommendationIndex) return false;
  if (typeof value.whyAlternativeWorse !== "string") return false;
  if (typeof value.explanation !== "string") return false;
  if (typeof value.concept !== "string") return false;
  return true;
}
