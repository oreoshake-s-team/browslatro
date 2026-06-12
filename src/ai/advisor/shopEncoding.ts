import type { PackAdviceCandidate, ShopAdviceCandidate } from "./types";

export const SHOP_INPUT_FEATURES = 16;

const ITEM_TYPES = [
  "joker",
  "planet",
  "tarot",
  "spectral",
  "playing-card",
  "pack",
  "voucher",
] as const;

export interface ShopRankInput {
  readonly money: number;
  readonly ante: number;
  readonly round: number;
  readonly candidates: ReadonlyArray<ShopAdviceCandidate>;
}

export interface PackRankInput {
  readonly money: number;
  readonly ante: number;
  readonly round: number;
  readonly picksRemaining: number;
  readonly candidates: ReadonlyArray<PackAdviceCandidate>;
}

function candidateRow(
  money: number,
  ante: number,
  round: number,
  picks: number,
  itemType: string,
  cost: number,
  isReroll: boolean,
  isLeave: boolean,
  isSkip: boolean,
): number[] {
  const hot = ITEM_TYPES.map((t) => (t === itemType ? 1 : 0));
  return [
    money / 20,
    ante / 8,
    round / 24,
    picks / 5,
    ...hot,
    cost / 20,
    cost <= money ? 1 : 0,
    isReroll ? 1 : 0,
    isLeave ? 1 : 0,
    isSkip ? 1 : 0,
  ];
}

export function encodeShopCandidates(input: ShopRankInput): Float32Array {
  const { money, ante, round } = input;
  return new Float32Array(
    input.candidates.flatMap((c) => {
      if (c.action === "buy")
        return candidateRow(money, ante, round, 0, c.item.itemType, c.item.cost, false, false, false);
      if (c.action === "reroll")
        return candidateRow(money, ante, round, 0, "", c.cost, true, false, false);
      return candidateRow(money, ante, round, 0, "", 0, false, true, false);
    }),
  );
}

export function encodePackCandidates(input: PackRankInput): Float32Array {
  const { money, ante, round, picksRemaining } = input;
  return new Float32Array(
    input.candidates.flatMap((c) => {
      if (c.action === "pick")
        return candidateRow(money, ante, round, picksRemaining, c.option.optionType, 0, false, false, false);
      return candidateRow(money, ante, round, picksRemaining, "", 0, false, false, true);
    }),
  );
}
