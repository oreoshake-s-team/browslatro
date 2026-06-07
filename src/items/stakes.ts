export type Stake =
  | "white"
  | "red"
  | "green"
  | "black"
  | "blue"
  | "purple"
  | "orange"
  | "gold";

export const STAKE_ORDER: ReadonlyArray<Stake> = [
  "white",
  "red",
  "green",
  "black",
  "blue",
  "purple",
  "orange",
  "gold",
];

export const DEFAULT_STAKE: Stake = "white";

export type StakeModifier =
  | { readonly kind: "red-small-blind-no-reward" }
  | { readonly kind: "green-ante-scaling" }
  | { readonly kind: "black-eternal-roll"; readonly chance: number }
  | { readonly kind: "blue-discard-delta"; readonly amount: number }
  | { readonly kind: "purple-ante-scaling" }
  | { readonly kind: "orange-perishable-roll"; readonly chance: number }
  | { readonly kind: "gold-rental-roll"; readonly chance: number };

export const BLACK_ETERNAL_ROLL_CHANCE = 0.3;
export const BLUE_DISCARD_DELTA = -1;
export const ORANGE_PERISHABLE_ROLL_CHANCE = 0.3;
export const GOLD_RENTAL_ROLL_CHANCE = 0.3;

export interface StakeSpec {
  readonly id: Stake;
  readonly name: string;
  readonly description: string;
  readonly implemented: boolean;
  readonly modifiers: ReadonlyArray<StakeModifier>;
}

const STAKE_SPECS: ReadonlyArray<StakeSpec> = [
  {
    id: "white",
    name: "White Stake",
    description: "Base difficulty.",
    implemented: true,
    modifiers: [],
  },
  {
    id: "red",
    name: "Red Stake",
    description: "Small Blind gives no reward money.",
    implemented: true,
    modifiers: [{ kind: "red-small-blind-no-reward" }],
  },
  {
    id: "green",
    name: "Green Stake",
    description: "Required score scales faster per Ante.",
    implemented: true,
    modifiers: [{ kind: "green-ante-scaling" }],
  },
  {
    id: "black",
    name: "Black Stake",
    description: "Shop can roll Eternal Jokers that cannot be sold or destroyed.",
    implemented: true,
    modifiers: [
      { kind: "black-eternal-roll", chance: BLACK_ETERNAL_ROLL_CHANCE },
    ],
  },
  {
    id: "blue",
    name: "Blue Stake",
    description: "-1 Discard per round.",
    implemented: true,
    modifiers: [{ kind: "blue-discard-delta", amount: BLUE_DISCARD_DELTA }],
  },
  {
    id: "purple",
    name: "Purple Stake",
    description: "Required score scales faster per ante (cumulative with Green).",
    implemented: true,
    modifiers: [{ kind: "purple-ante-scaling" }],
  },
  {
    id: "orange",
    name: "Orange Stake",
    description:
      "Shop and Booster Pack Jokers may roll Perishable (debuffed after a few rounds).",
    implemented: true,
    modifiers: [
      {
        kind: "orange-perishable-roll",
        chance: ORANGE_PERISHABLE_ROLL_CHANCE,
      },
    ],
  },
  {
    id: "gold",
    name: "Gold Stake",
    description:
      "Shop and Booster Pack Jokers may roll Rental (costs $1, drains $3 at end of round).",
    implemented: true,
    modifiers: [
      {
        kind: "gold-rental-roll",
        chance: GOLD_RENTAL_ROLL_CHANCE,
      },
    ],
  },
];

export function createStakeCatalog(): ReadonlyArray<StakeSpec> {
  return STAKE_SPECS;
}

export function getStakeSpec(id: Stake): StakeSpec {
  const spec = STAKE_SPECS.find((s) => s.id === id);
  if (!spec) throw new Error(`unknown stake: ${id}`);
  return spec;
}

export function stakeRank(id: Stake): number {
  return STAKE_ORDER.indexOf(id);
}

export function getActiveStakes(stake: Stake): ReadonlyArray<Stake> {
  const idx = stakeRank(stake);
  return STAKE_ORDER.slice(0, idx + 1);
}

export function getActiveStakeModifiers(
  stake: Stake,
): ReadonlyArray<StakeModifier> {
  return getActiveStakes(stake).flatMap((id) => getStakeSpec(id).modifiers);
}

export function hasStakeModifier(
  stake: Stake,
  kind: StakeModifier["kind"],
): boolean {
  return getActiveStakeModifiers(stake).some((m) => m.kind === kind);
}

import type { StakeStickerOdds } from "./jokers";

export function stakeStartingDiscardsDelta(stake: Stake): number {
  let delta = 0;
  for (const mod of getActiveStakeModifiers(stake)) {
    if (mod.kind === "blue-discard-delta") delta += mod.amount;
  }
  return delta;
}

export function stakeStickerOdds(stake: Stake): StakeStickerOdds | undefined {
  const odds: { eternal?: number; perishable?: number; rental?: number } = {};
  for (const mod of getActiveStakeModifiers(stake)) {
    if (mod.kind === "black-eternal-roll") odds.eternal = mod.chance;
    if (mod.kind === "orange-perishable-roll") odds.perishable = mod.chance;
    if (mod.kind === "gold-rental-roll") odds.rental = mod.chance;
  }
  if (
    odds.eternal === undefined &&
    odds.perishable === undefined &&
    odds.rental === undefined
  ) {
    return undefined;
  }
  return odds;
}
