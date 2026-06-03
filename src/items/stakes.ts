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

export type StakeModifier = never;

export interface StakeSpec {
  readonly id: Stake;
  readonly name: string;
  readonly description: string;
  readonly modifiers: ReadonlyArray<StakeModifier>;
}

const STAKE_SPECS: ReadonlyArray<StakeSpec> = [
  {
    id: "white",
    name: "White Stake",
    description: "Base difficulty.",
    modifiers: [],
  },
  {
    id: "red",
    name: "Red Stake",
    description: "Small Blind gives no reward money.",
    modifiers: [],
  },
  {
    id: "green",
    name: "Green Stake",
    description: "Required score scales faster per ante.",
    modifiers: [],
  },
  {
    id: "black",
    name: "Black Stake",
    description: "Shop can roll Eternal Jokers that cannot be sold or destroyed.",
    modifiers: [],
  },
  {
    id: "blue",
    name: "Blue Stake",
    description: "-1 Discard.",
    modifiers: [],
  },
  {
    id: "purple",
    name: "Purple Stake",
    description: "Required score scales faster per ante (cumulative with Green).",
    modifiers: [],
  },
  {
    id: "orange",
    name: "Orange Stake",
    description: "Booster Packs cost $1 more per ante.",
    modifiers: [],
  },
  {
    id: "gold",
    name: "Gold Stake",
    description: "-1 hand size.",
    modifiers: [],
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
