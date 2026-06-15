import type { BlindAdviceCandidate } from "./types";

export const BLIND_INPUT_FEATURES = 11;

const BLIND_KINDS = ["small", "big", "boss"] as const;

export interface BlindRankInput {
  readonly kind: string;
  readonly ante: number;
  readonly scoreTarget: number;
  readonly payout: number;
  readonly money: number;
  readonly jokerCount: number;
  readonly consumableCount: number;
  readonly candidates: ReadonlyArray<BlindAdviceCandidate>;
}

function blindRow(
  input: BlindRankInput,
  isPlay: boolean,
  isSkip: boolean,
): number[] {
  const hot = BLIND_KINDS.map((k) => (k === input.kind ? 1 : 0));
  return [
    input.money / 20,
    input.ante / 8,
    ...hot,
    Math.log1p(input.scoreTarget) / 12,
    input.payout / 20,
    input.jokerCount / 5,
    input.consumableCount / 2,
    isPlay ? 1 : 0,
    isSkip ? 1 : 0,
  ];
}

export function encodeBlindCandidates(input: BlindRankInput): Float32Array {
  return new Float32Array(
    input.candidates.flatMap((c) =>
      c.action === "play"
        ? blindRow(input, true, false)
        : blindRow(input, false, true),
    ),
  );
}
