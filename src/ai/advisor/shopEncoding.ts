import type { Card } from "../../cards/types";
import type { Joker } from "../../items/jokers/types";
import type { HandStats } from "../../scoring/handStats";
import {
  ENHANCEMENTS,
  HAND_LABELS,
  JOKER_EFFECT_CATEGORIES,
  JOKER_RARITIES,
  jokerEffectCategory,
} from "../encode";
import { SHOP_CANDIDATE_CATEGORIES } from "./shopCategory";
import {
  SHOP_ATTRIBUTE_FEATURES,
  ZERO_SHOP_ATTRIBUTES,
} from "./shopCandidateAttributes";
import { VOUCHER_FEATURES, ZERO_VOUCHER_FEATURES } from "./voucherFeatures";
import type { PackAdviceCandidate, ShopAdviceCandidate } from "./types";

const ITEM_TYPES = [
  "joker",
  "planet",
  "tarot",
  "spectral",
  "playing-card",
  "pack",
  "voucher",
] as const;

export const SHOP_BUILD_FEATURES =
  HAND_LABELS.length +
  1 +
  JOKER_RARITIES.length +
  JOKER_EFFECT_CATEGORIES.length +
  1 +
  ENHANCEMENTS.length;

export const SHOP_INPUT_FEATURES =
  4 +
  SHOP_BUILD_FEATURES +
  ITEM_TYPES.length +
  5 +
  SHOP_CANDIDATE_CATEGORIES.length +
  SHOP_ATTRIBUTE_FEATURES +
  VOUCHER_FEATURES;

export interface ShopBuildJoker {
  readonly effectKind: string;
  readonly rarity: string;
}

export interface ShopBuild {
  readonly handLevels: Readonly<Record<string, number>>;
  readonly jokers: ReadonlyArray<ShopBuildJoker>;
  readonly deckEnhancements: Readonly<Record<string, number>>;
  readonly consumablesHeld: number;
}

export const EMPTY_SHOP_BUILD: ShopBuild = {
  handLevels: {},
  jokers: [],
  deckEnhancements: {},
  consumablesHeld: 0,
};

export function shopBuildSummary(input: {
  readonly jokers: ReadonlyArray<Joker>;
  readonly handStats: HandStats;
  readonly deck: ReadonlyArray<Card>;
  readonly consumablesHeld: number;
}): ShopBuild {
  const handLevels: Record<string, number> = {};
  for (const [label, entry] of Object.entries(input.handStats)) {
    handLevels[label] = entry.level;
  }
  const deckEnhancements: Record<string, number> = {};
  for (const card of input.deck) {
    if (card.enhancement != null) {
      deckEnhancements[card.enhancement] =
        (deckEnhancements[card.enhancement] ?? 0) + 1;
    }
  }
  return {
    handLevels,
    jokers: input.jokers.map((joker) => ({
      effectKind: joker.effect.kind,
      rarity: joker.rarity,
    })),
    deckEnhancements,
    consumablesHeld: input.consumablesHeld,
  };
}

function encodeShopBuild(build: ShopBuild): number[] {
  const rarityCounts: Record<string, number> = {};
  for (const rarity of JOKER_RARITIES) rarityCounts[rarity] = 0;
  const categoryCounts: Record<string, number> = {};
  for (const category of JOKER_EFFECT_CATEGORIES) categoryCounts[category] = 0;
  for (const joker of build.jokers) {
    if (rarityCounts[joker.rarity] !== undefined) {
      rarityCounts[joker.rarity] += 1;
    }
    categoryCounts[jokerEffectCategory(joker.effectKind)] += 1;
  }
  return [
    ...HAND_LABELS.map((label) => (build.handLevels[label] ?? 1) / 20),
    build.jokers.length / 5,
    ...JOKER_RARITIES.map((rarity) => rarityCounts[rarity] / 5),
    ...JOKER_EFFECT_CATEGORIES.map((category) => categoryCounts[category] / 5),
    build.consumablesHeld / 2,
    ...ENHANCEMENTS.map((enh) => (build.deckEnhancements[enh] ?? 0) / 52),
  ];
}

export interface ShopRankInput {
  readonly money: number;
  readonly ante: number;
  readonly round: number;
  readonly build?: ShopBuild;
  readonly candidates: ReadonlyArray<ShopAdviceCandidate>;
}

export interface PackRankInput {
  readonly money: number;
  readonly ante: number;
  readonly round: number;
  readonly picksRemaining: number;
  readonly build?: ShopBuild;
  readonly candidates: ReadonlyArray<PackAdviceCandidate>;
}

function candidateRow(
  money: number,
  ante: number,
  round: number,
  picks: number,
  build: ReadonlyArray<number>,
  itemType: string,
  category: string,
  attributes: ReadonlyArray<number>,
  voucherFeatures: ReadonlyArray<number>,
  cost: number,
  isReroll: boolean,
  isLeave: boolean,
  isSkip: boolean,
): number[] {
  const hot = ITEM_TYPES.map((t) => (t === itemType ? 1 : 0));
  const categoryHot = SHOP_CANDIDATE_CATEGORIES.map((c) => (c === category ? 1 : 0));
  const attrs =
    attributes.length === SHOP_ATTRIBUTE_FEATURES
      ? attributes
      : ZERO_SHOP_ATTRIBUTES;
  const vfeats =
    voucherFeatures.length === VOUCHER_FEATURES
      ? voucherFeatures
      : ZERO_VOUCHER_FEATURES;
  return [
    money / 20,
    ante / 8,
    round / 24,
    picks / 5,
    ...build,
    ...hot,
    cost / 20,
    cost <= money ? 1 : 0,
    isReroll ? 1 : 0,
    isLeave ? 1 : 0,
    isSkip ? 1 : 0,
    ...categoryHot,
    ...attrs,
    ...vfeats,
  ];
}

export function encodeShopCandidates(input: ShopRankInput): Float32Array {
  const { money, ante, round } = input;
  const build = encodeShopBuild(input.build ?? EMPTY_SHOP_BUILD);
  return new Float32Array(
    input.candidates.flatMap((c) => {
      if (c.action === "buy" || c.action === "sell")
        return candidateRow(money, ante, round, 0, build, c.item.itemType, c.item.category, c.item.attributes ?? ZERO_SHOP_ATTRIBUTES, c.item.voucherFeatures ?? ZERO_VOUCHER_FEATURES, c.item.cost, false, false, false);
      if (c.action === "reroll")
        return candidateRow(money, ante, round, 0, build, "", "other", ZERO_SHOP_ATTRIBUTES, ZERO_VOUCHER_FEATURES, c.cost, true, false, false);
      return candidateRow(money, ante, round, 0, build, "", "other", ZERO_SHOP_ATTRIBUTES, ZERO_VOUCHER_FEATURES, 0, false, true, false);
    }),
  );
}

export const SHOP_INPUT_FEATURES_V2 = SHOP_INPUT_FEATURES + 1;

function candidateRowV2(
  money: number,
  ante: number,
  round: number,
  picks: number,
  build: ReadonlyArray<number>,
  itemType: string,
  category: string,
  attributes: ReadonlyArray<number>,
  voucherFeatures: ReadonlyArray<number>,
  cost: number,
  isReroll: boolean,
  isLeave: boolean,
  isSkip: boolean,
  isUse: boolean,
): number[] {
  return [
    ...candidateRow(money, ante, round, picks, build, itemType, category, attributes, voucherFeatures, cost, isReroll, isLeave, isSkip),
    isUse ? 1 : 0,
  ];
}

export function encodeShopCandidatesV2(input: ShopRankInput): Float32Array {
  const { money, ante, round } = input;
  const build = encodeShopBuild(input.build ?? EMPTY_SHOP_BUILD);
  return new Float32Array(
    input.candidates.flatMap((c) => {
      if (c.action === "buy" || c.action === "sell")
        return candidateRowV2(money, ante, round, 0, build, c.item.itemType, c.item.category, c.item.attributes ?? ZERO_SHOP_ATTRIBUTES, c.item.voucherFeatures ?? ZERO_VOUCHER_FEATURES, c.item.cost, false, false, false, false);
      if (c.action === "use")
        return candidateRowV2(money, ante, round, 0, build, c.item.itemType, c.item.category, c.item.attributes ?? ZERO_SHOP_ATTRIBUTES, c.item.voucherFeatures ?? ZERO_VOUCHER_FEATURES, c.item.cost, false, false, false, true);
      if (c.action === "reroll")
        return candidateRowV2(money, ante, round, 0, build, "", "other", ZERO_SHOP_ATTRIBUTES, ZERO_VOUCHER_FEATURES, c.cost, true, false, false, false);
      return candidateRowV2(money, ante, round, 0, build, "", "other", ZERO_SHOP_ATTRIBUTES, ZERO_VOUCHER_FEATURES, 0, false, true, false, false);
    }),
  );
}

export function encodePackCandidates(input: PackRankInput): Float32Array {
  const { money, ante, round, picksRemaining } = input;
  const build = encodeShopBuild(input.build ?? EMPTY_SHOP_BUILD);
  return new Float32Array(
    input.candidates.flatMap((c) => {
      if (c.action === "pick")
        return candidateRow(money, ante, round, picksRemaining, build, c.option.optionType, c.option.category, c.option.attributes ?? ZERO_SHOP_ATTRIBUTES, ZERO_VOUCHER_FEATURES, 0, false, false, false);
      return candidateRow(money, ante, round, picksRemaining, build, "", "other", ZERO_SHOP_ATTRIBUTES, ZERO_VOUCHER_FEATURES, 0, false, false, true);
    }),
  );
}

export function encodePackCandidatesV2(input: PackRankInput): Float32Array {
  const { money, ante, round, picksRemaining } = input;
  const build = encodeShopBuild(input.build ?? EMPTY_SHOP_BUILD);
  return new Float32Array(
    input.candidates.flatMap((c) => {
      if (c.action === "pick")
        return candidateRowV2(money, ante, round, picksRemaining, build, c.option.optionType, c.option.category, c.option.attributes ?? ZERO_SHOP_ATTRIBUTES, ZERO_VOUCHER_FEATURES, 0, false, false, false, false);
      return candidateRowV2(money, ante, round, picksRemaining, build, "", "other", ZERO_SHOP_ATTRIBUTES, ZERO_VOUCHER_FEATURES, 0, false, false, true, false);
    }),
  );
}
