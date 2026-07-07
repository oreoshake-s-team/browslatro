import type { ShopAdviceCandidate } from "./types";
import { MAX_JOKERS } from "../../items/jokers/constants";
import type { ShopBuild, ShopBuildJoker } from "./shopEncoding";

export interface ShopSearchState {
  readonly build: ShopBuild;
  readonly money: number;
}

const CATEGORY_EFFECT_KIND: Record<string, string> = {
  "joker-mult": "additive-mult",
  "joker-x-mult": "x-mult",
  "joker-retrigger": "retrigger",
  "joker-money": "extra-money",
  "joker-passive": "passive-run-stats",
};

const RARITY_ATTRIBUTE_INDEX = 14;
const RARITY_BY_ORDINAL: ReadonlyArray<readonly [number, string]> = [
  [0.25, "common"],
  [0.5, "uncommon"],
  [0.75, "rare"],
  [1, "legendary"],
];

function candidateJoker(item: {
  readonly category: string;
  readonly attributes?: ReadonlyArray<number>;
}): ShopBuildJoker | null {
  const effectKind = CATEGORY_EFFECT_KIND[item.category];
  if (effectKind === undefined) return null;
  const ordinal = item.attributes?.[RARITY_ATTRIBUTE_INDEX] ?? 0.25;
  const match = RARITY_BY_ORDINAL.find(([value]) => Math.abs(value - ordinal) < 1e-6);
  return { effectKind, rarity: match === undefined ? "common" : match[1] };
}

function leveledHandStats(
  handLevels: Readonly<Record<string, number>>,
  advances: ReadonlyArray<string>,
): Record<string, number> {
  const next: Record<string, number> = { ...handLevels };
  for (const hand of advances) {
    next[hand] = (next[hand] ?? 1) + 1;
  }
  return next;
}

export function applyShopAction(
  state: ShopSearchState,
  candidate: ShopAdviceCandidate,
): ShopSearchState | null {
  if (candidate.action === "leave") return state;

  if (candidate.action === "sell") {
    const sold = candidateJoker(candidate.item);
    if (sold === null) return null;
    const index = state.build.jokers.findIndex(
      (joker) => joker.effectKind === sold.effectKind && joker.rarity === sold.rarity,
    );
    if (index === -1) return null;
    const jokers = state.build.jokers.filter((_, i) => i !== index);
    return {
      build: { ...state.build, jokers },
      money: state.money - candidate.item.cost,
    };
  }

  if (candidate.action !== "buy" && candidate.action !== "use") return null;
  const item = candidate.item;

  if (item.itemType === "joker" && candidate.action === "buy") {
    if (state.build.jokers.length >= MAX_JOKERS) return null;
    const joker = candidateJoker(item);
    if (joker === null || item.cost > state.money) return null;
    return {
      build: { ...state.build, jokers: [...state.build.jokers, joker] },
      money: state.money - item.cost,
    };
  }

  if (item.itemType === "planet" || item.itemType === "tarot" || item.itemType === "spectral") {
    if (candidate.action === "buy") {
      if (item.cost > state.money) return null;
      return {
        build: { ...state.build, consumablesHeld: state.build.consumablesHeld + 1 },
        money: state.money - item.cost,
      };
    }
    if (item.itemType === "planet" && item.advancesHands !== undefined) {
      return {
        build: {
          ...state.build,
          handLevels: leveledHandStats(state.build.handLevels, item.advancesHands),
          consumablesHeld: Math.max(0, state.build.consumablesHeld - 1),
        },
        money: state.money,
      };
    }
  }

  return null;
}
