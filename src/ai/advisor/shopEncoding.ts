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
import { PACK_FEATURES, ZERO_PACK_FEATURES } from "./packFeatures";
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

export const SHOP_BUILD_WINCON_FEATURES = 2;
export const SHOP_CANDIDATE_WINCON_FEATURES = 3;

export const SHOP_BUILD_FEATURES =
  HAND_LABELS.length +
  1 +
  JOKER_RARITIES.length +
  JOKER_EFFECT_CATEGORIES.length +
  1 +
  ENHANCEMENTS.length +
  SHOP_BUILD_WINCON_FEATURES;

export const SHOP_CONTEXT_FEATURES = 4 + SHOP_BUILD_FEATURES;

export const SHOP_CANDIDATE_PACK_FEATURES = PACK_FEATURES;

export const SHOP_INPUT_FEATURES =
  SHOP_CONTEXT_FEATURES +
  ITEM_TYPES.length +
  5 +
  SHOP_CANDIDATE_CATEGORIES.length +
  SHOP_ATTRIBUTE_FEATURES +
  VOUCHER_FEATURES +
  SHOP_CANDIDATE_WINCON_FEATURES +
  SHOP_CANDIDATE_PACK_FEATURES;

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

interface BuildSignals {
  readonly topHand: string | null;
  readonly topLevel: number;
  readonly secondLevel: number;
  readonly handLevels: Readonly<Record<string, number>>;
  readonly categoryCounts: Readonly<Record<string, number>>;
}

function buildSignals(build: ShopBuild): BuildSignals {
  let topHand: string | null = null;
  let topLevel = 1;
  let secondLevel = 1;
  for (const label of HAND_LABELS) {
    const level = build.handLevels[label] ?? 1;
    if (level > topLevel) {
      secondLevel = topLevel;
      topLevel = level;
      topHand = label;
    } else if (level > secondLevel) {
      secondLevel = level;
    }
  }
  const categoryCounts: Record<string, number> = {};
  for (const category of JOKER_EFFECT_CATEGORIES) categoryCounts[category] = 0;
  for (const joker of build.jokers) {
    categoryCounts[jokerEffectCategory(joker.effectKind)] += 1;
  }
  return { topHand, topLevel, secondLevel, handLevels: build.handLevels, categoryCounts };
}

function winconFeatures(
  advancesHands: ReadonlyArray<string> | undefined,
  category: string,
  sig: BuildSignals,
): number[] {
  const advances = advancesHands ?? [];
  const advancesTopHand =
    sig.topHand !== null && advances.includes(sig.topHand) ? 1 : 0;
  let advancedHandLevel = 0;
  for (const hand of advances) {
    advancedHandLevel = Math.max(advancedHandLevel, ((sig.handLevels[hand] ?? 1) - 1) / 20);
  }
  const sameCategoryJokerOwned = category.startsWith("joker-")
    ? (sig.categoryCounts[category.slice("joker-".length)] ?? 0) / 5
    : 0;
  return [advancesTopHand, advancedHandLevel, sameCategoryJokerOwned];
}

function encodeShopBuild(build: ShopBuild, sig: BuildSignals): number[] {
  const rarityCounts: Record<string, number> = {};
  for (const rarity of JOKER_RARITIES) rarityCounts[rarity] = 0;
  for (const joker of build.jokers) {
    if (rarityCounts[joker.rarity] !== undefined) {
      rarityCounts[joker.rarity] += 1;
    }
  }
  return [
    ...HAND_LABELS.map((label) => (build.handLevels[label] ?? 1) / 20),
    build.jokers.length / 5,
    ...JOKER_RARITIES.map((rarity) => rarityCounts[rarity] / 5),
    ...JOKER_EFFECT_CATEGORIES.map((category) => sig.categoryCounts[category] / 5),
    build.consumablesHeld / 2,
    ...ENHANCEMENTS.map((enh) => (build.deckEnhancements[enh] ?? 0) / 52),
    (sig.topLevel - 1) / 20,
    (sig.topLevel - sig.secondLevel) / 20,
  ];
}

export function encodeShopSearchContext(
  build: ShopBuild,
  money: number,
  ante: number,
  round: number,
): number[] {
  const sig = buildSignals(build);
  return [money / 20, ante / 8, round / 24, 0, ...encodeShopBuild(build, sig)];
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
  packFeatures: ReadonlyArray<number>,
  cost: number,
  isReroll: boolean,
  isLeave: boolean,
  isSkip: boolean,
  advancesHands: ReadonlyArray<string> | undefined,
  sig: BuildSignals,
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
  const pfeats =
    packFeatures.length === PACK_FEATURES ? packFeatures : ZERO_PACK_FEATURES;
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
    ...winconFeatures(advancesHands, category, sig),
    ...pfeats,
  ];
}

export function encodeShopCandidates(input: ShopRankInput): Float32Array {
  const { money, ante, round } = input;
  const sig = buildSignals(input.build ?? EMPTY_SHOP_BUILD);
  const build = encodeShopBuild(input.build ?? EMPTY_SHOP_BUILD, sig);
  return new Float32Array(
    input.candidates.flatMap((c) => {
      if (c.action === "buy" || c.action === "sell")
        return candidateRow(money, ante, round, 0, build, c.item.itemType, c.item.category, c.item.attributes ?? ZERO_SHOP_ATTRIBUTES, c.item.voucherFeatures ?? ZERO_VOUCHER_FEATURES, c.item.packFeatures ?? ZERO_PACK_FEATURES, c.item.cost, false, false, false, c.item.advancesHands, sig);
      if (c.action === "reroll")
        return candidateRow(money, ante, round, 0, build, "", "other", ZERO_SHOP_ATTRIBUTES, ZERO_VOUCHER_FEATURES, ZERO_PACK_FEATURES, c.cost, true, false, false, undefined, sig);
      return candidateRow(money, ante, round, 0, build, "", "other", ZERO_SHOP_ATTRIBUTES, ZERO_VOUCHER_FEATURES, ZERO_PACK_FEATURES, 0, false, true, false, undefined, sig);
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
  packFeatures: ReadonlyArray<number>,
  cost: number,
  isReroll: boolean,
  isLeave: boolean,
  isSkip: boolean,
  isUse: boolean,
  advancesHands: ReadonlyArray<string> | undefined,
  sig: BuildSignals,
): number[] {
  return [
    ...candidateRow(money, ante, round, picks, build, itemType, category, attributes, voucherFeatures, packFeatures, cost, isReroll, isLeave, isSkip, advancesHands, sig),
    isUse ? 1 : 0,
  ];
}

export function encodeShopCandidatesV2(input: ShopRankInput): Float32Array {
  const { money, ante, round } = input;
  const sig = buildSignals(input.build ?? EMPTY_SHOP_BUILD);
  const build = encodeShopBuild(input.build ?? EMPTY_SHOP_BUILD, sig);
  return new Float32Array(
    input.candidates.flatMap((c) => {
      if (c.action === "buy" || c.action === "sell")
        return candidateRowV2(money, ante, round, 0, build, c.item.itemType, c.item.category, c.item.attributes ?? ZERO_SHOP_ATTRIBUTES, c.item.voucherFeatures ?? ZERO_VOUCHER_FEATURES, c.item.packFeatures ?? ZERO_PACK_FEATURES, c.item.cost, false, false, false, false, c.item.advancesHands, sig);
      if (c.action === "use")
        return candidateRowV2(money, ante, round, 0, build, c.item.itemType, c.item.category, c.item.attributes ?? ZERO_SHOP_ATTRIBUTES, c.item.voucherFeatures ?? ZERO_VOUCHER_FEATURES, ZERO_PACK_FEATURES, c.item.cost, false, false, false, true, c.item.advancesHands, sig);
      if (c.action === "reroll")
        return candidateRowV2(money, ante, round, 0, build, "", "other", ZERO_SHOP_ATTRIBUTES, ZERO_VOUCHER_FEATURES, ZERO_PACK_FEATURES, c.cost, true, false, false, false, undefined, sig);
      return candidateRowV2(money, ante, round, 0, build, "", "other", ZERO_SHOP_ATTRIBUTES, ZERO_VOUCHER_FEATURES, ZERO_PACK_FEATURES, 0, false, true, false, false, undefined, sig);
    }),
  );
}

export function encodePackCandidates(input: PackRankInput): Float32Array {
  const { money, ante, round, picksRemaining } = input;
  const sig = buildSignals(input.build ?? EMPTY_SHOP_BUILD);
  const build = encodeShopBuild(input.build ?? EMPTY_SHOP_BUILD, sig);
  return new Float32Array(
    input.candidates.flatMap((c) => {
      if (c.action === "pick")
        return candidateRow(money, ante, round, picksRemaining, build, c.option.optionType, c.option.category, c.option.attributes ?? ZERO_SHOP_ATTRIBUTES, ZERO_VOUCHER_FEATURES, ZERO_PACK_FEATURES, 0, false, false, false, c.option.advancesHands, sig);
      return candidateRow(money, ante, round, picksRemaining, build, "", "other", ZERO_SHOP_ATTRIBUTES, ZERO_VOUCHER_FEATURES, ZERO_PACK_FEATURES, 0, false, false, true, undefined, sig);
    }),
  );
}

export function encodePackCandidatesV2(input: PackRankInput): Float32Array {
  const { money, ante, round, picksRemaining } = input;
  const sig = buildSignals(input.build ?? EMPTY_SHOP_BUILD);
  const build = encodeShopBuild(input.build ?? EMPTY_SHOP_BUILD, sig);
  return new Float32Array(
    input.candidates.flatMap((c) => {
      if (c.action === "pick")
        return candidateRowV2(money, ante, round, picksRemaining, build, c.option.optionType, c.option.category, c.option.attributes ?? ZERO_SHOP_ATTRIBUTES, ZERO_VOUCHER_FEATURES, ZERO_PACK_FEATURES, 0, false, false, false, false, c.option.advancesHands, sig);
      return candidateRowV2(money, ante, round, picksRemaining, build, "", "other", ZERO_SHOP_ATTRIBUTES, ZERO_VOUCHER_FEATURES, ZERO_PACK_FEATURES, 0, false, false, true, false, undefined, sig);
    }),
  );
}
