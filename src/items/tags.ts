import { createRngConfig } from "../dev/rngConfig";
import type { ImmediateAction } from "../run/immediateActions";
import type { NextShopModifier } from "../run/nextShopMods";
import type { HandLabel } from "../scoring/handEvaluator";
import { availablePlanets, createPlanetCatalog, type PlanetCard } from "./planets";

export type TagId =
  | "investment"
  | "d6"
  | "handy"
  | "garbage"
  | "speed"
  | "economy"
  | "charm"
  | "ethereal"
  | "standard"
  | "meteor"
  | "buffoon"
  | "coupon"
  | "uncommon"
  | "rare"
  | "voucher"
  | "top-up"
  | "boss"
  | "orbital"
  | "juggle"
  | "negative"
  | "foil"
  | "holographic"
  | "polychrome"
  | "double";

export type TagEffect =
  | { readonly category: "deferred-boss-payout"; readonly amount: number }
  | { readonly category: "immediate"; readonly action: ImmediateAction }
  | {
      readonly category: "next-shop";
      readonly modifiers: ReadonlyArray<NextShopModifier>;
    }
  | { readonly category: "next-round"; readonly handSizeBonus: number }
  | { readonly category: "duplicate-next" };

export interface TagSpec {
  readonly id: TagId;
  readonly name: string;
  readonly description: string;
  readonly effect: TagEffect;
}

export const INVESTMENT_TAG_REWARD = 25;

const TAG_SPECS: ReadonlyArray<TagSpec> = [
  {
    id: "investment",
    name: "Investment Tag",
    description: `After defeating the next Boss Blind, gain $${INVESTMENT_TAG_REWARD}.`,
    effect: { category: "deferred-boss-payout", amount: INVESTMENT_TAG_REWARD },
  },
  {
    id: "d6",
    name: "D6 Tag",
    description: "Rerolls in the next shop start at $0.",
    effect: { category: "next-shop", modifiers: [{ kind: "free-rerolls" }] },
  },
  {
    id: "handy",
    name: "Handy Tag",
    description: "Gain $1 for each hand played this run.",
    effect: {
      category: "immediate",
      action: { kind: "money-per-stat", stat: "handsPlayed", perUnit: 1 },
    },
  },
  {
    id: "garbage",
    name: "Garbage Tag",
    description: "Gain $1 for each unused discard this run.",
    effect: {
      category: "immediate",
      action: { kind: "money-per-stat", stat: "unusedDiscards", perUnit: 1 },
    },
  },
  {
    id: "speed",
    name: "Speed Tag",
    description: "Gain $5 for each blind skipped this run.",
    effect: {
      category: "immediate",
      action: { kind: "money-per-stat", stat: "blindsSkipped", perUnit: 5 },
    },
  },
  {
    id: "economy",
    name: "Economy Tag",
    description: "Double your money (max gain $40).",
    effect: {
      category: "immediate",
      action: { kind: "double-money", cap: 40 },
    },
  },
  {
    id: "charm",
    name: "Charm Tag",
    description: "Immediately open a free Mega Arcana Pack.",
    effect: {
      category: "immediate",
      action: { kind: "open-pack", pool: "arcana", variant: "mega" },
    },
  },
  {
    id: "ethereal",
    name: "Ethereal Tag",
    description: "Immediately open a free Spectral Pack.",
    effect: {
      category: "immediate",
      action: { kind: "open-pack", pool: "spectral", variant: "normal" },
    },
  },
  {
    id: "standard",
    name: "Standard Tag",
    description: "Immediately open a free Mega Standard Pack.",
    effect: {
      category: "immediate",
      action: { kind: "open-pack", pool: "standard", variant: "mega" },
    },
  },
  {
    id: "meteor",
    name: "Meteor Tag",
    description: "Immediately open a free Mega Celestial Pack.",
    effect: {
      category: "immediate",
      action: { kind: "open-pack", pool: "celestial", variant: "mega" },
    },
  },
  {
    id: "buffoon",
    name: "Buffoon Tag",
    description: "Immediately open a free Mega Buffoon Pack.",
    effect: {
      category: "immediate",
      action: { kind: "open-pack", pool: "buffoon", variant: "mega" },
    },
  },
  {
    id: "coupon",
    name: "Coupon Tag",
    description: "Cards and booster packs in the next shop are free.",
    effect: {
      category: "next-shop",
      modifiers: [{ kind: "free-shop-items" }],
    },
  },
  {
    id: "uncommon",
    name: "Uncommon Tag",
    description: "The next shop has a free Uncommon Joker.",
    effect: {
      category: "next-shop",
      modifiers: [{ kind: "free-joker", rarity: "uncommon" }],
    },
  },
  {
    id: "rare",
    name: "Rare Tag",
    description: "The next shop has a free Rare Joker.",
    effect: {
      category: "next-shop",
      modifiers: [{ kind: "free-joker", rarity: "rare" }],
    },
  },
  {
    id: "voucher",
    name: "Voucher Tag",
    description: "Adds a Voucher to the next shop.",
    effect: {
      category: "next-shop",
      modifiers: [{ kind: "extra-voucher" }],
    },
  },
  {
    id: "top-up",
    name: "Top-up Tag",
    description: "Create up to 2 Common Jokers.",
    effect: {
      category: "immediate",
      action: { kind: "create-jokers", rarity: "common", count: 2 },
    },
  },
  {
    id: "boss",
    name: "Boss Tag",
    description: "Reroll the Boss Blind.",
    effect: {
      category: "immediate",
      action: { kind: "reroll-boss" },
    },
  },
  {
    id: "orbital",
    name: "Orbital Tag",
    description: "Upgrade a random poker hand by 3 levels.",
    effect: {
      category: "immediate",
      action: { kind: "upgrade-hand", levels: 3 },
    },
  },
  {
    id: "juggle",
    name: "Juggle Tag",
    description: "+3 hand size for the next round.",
    effect: { category: "next-round", handSizeBonus: 3 },
  },
  {
    id: "negative",
    name: "Negative Tag",
    description: "The next base-edition shop Joker becomes Negative and free.",
    effect: {
      category: "next-shop",
      modifiers: [{ kind: "free-edition-joker", edition: "negative" }],
    },
  },
  {
    id: "foil",
    name: "Foil Tag",
    description: "The next base-edition shop Joker becomes Foil and free.",
    effect: {
      category: "next-shop",
      modifiers: [{ kind: "free-edition-joker", edition: "foil" }],
    },
  },
  {
    id: "holographic",
    name: "Holographic Tag",
    description: "The next base-edition shop Joker becomes Holographic and free.",
    effect: {
      category: "next-shop",
      modifiers: [{ kind: "free-edition-joker", edition: "holographic" }],
    },
  },
  {
    id: "polychrome",
    name: "Polychrome Tag",
    description: "The next base-edition shop Joker becomes Polychrome and free.",
    effect: {
      category: "next-shop",
      modifiers: [{ kind: "free-edition-joker", edition: "polychrome" }],
    },
  },
  {
    id: "double",
    name: "Double Tag",
    description: "Duplicates the next selected tag (excluding another Double).",
    effect: { category: "duplicate-next" },
  },
];

export function createTagCatalog(): ReadonlyArray<TagSpec> {
  return TAG_SPECS;
}

export function getTagSpec(id: TagId): TagSpec {
  const spec = TAG_SPECS.find((t) => t.id === id);
  if (!spec) throw new Error(`unknown tag: ${id}`);
  return spec;
}

export function resolveTagEffect(id: TagId): TagEffect {
  return getTagSpec(id).effect;
}

export function totalDeferredBossPayout(ids: ReadonlyArray<TagId>): number {
  return ids.reduce((sum, id) => {
    const effect = resolveTagEffect(id);
    return effect.category === "deferred-boss-payout" ? sum + effect.amount : sum;
  }, 0);
}

export function pruneTagsByCategory(
  ids: ReadonlyArray<TagId>,
  category: TagEffect["category"],
  mode: "first" | "all" = "all",
): ReadonlyArray<TagId> {
  if (mode === "first") {
    const idx = ids.findIndex((id) => resolveTagEffect(id).category === category);
    if (idx === -1) return ids;
    return [...ids.slice(0, idx), ...ids.slice(idx + 1)];
  }
  const next = ids.filter((id) => resolveTagEffect(id).category !== category);
  return next.length === ids.length ? ids : next;
}

export interface AnteSkipOffer {
  readonly id: TagId;
  readonly orbitalHand?: HandLabel;
}

export interface AnteSkipOffers {
  readonly small: AnteSkipOffer;
  readonly big: AnteSkipOffer;
}

export const tagOfferRngConfig = createRngConfig();

const FORCE_SKIP_TAG_IDS_KEY = "browslatro:forceSkipTagIds";

function readForcedSkipTagId(): TagId | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(FORCE_SKIP_TAG_IDS_KEY);
    if (!raw) return null;
    const first = raw.split(",")[0]?.trim();
    if (!first) return null;
    const allIds = TAG_SPECS.map((s) => s.id) as ReadonlyArray<string>;
    if (allIds.includes(first)) return first as TagId;
    return null;
  } catch {
    return null;
  }
}

export function rollSkipTag(rng: () => number = Math.random): TagId {
  const forced = readForcedSkipTagId();
  if (forced !== null) return forced;
  const ids = TAG_SPECS.map((spec) => spec.id);
  const index = Math.min(ids.length - 1, Math.floor(rng() * ids.length));
  return ids[index];
}

function rollOrbitalHand(
  rng: () => number,
  planetCatalog: ReadonlyArray<PlanetCard>,
): HandLabel {
  const planet =
    planetCatalog[Math.min(planetCatalog.length - 1, Math.floor(rng() * planetCatalog.length))];
  return planet.hands[0];
}

export function rollSkipOffer(
  rng: () => number = Math.random,
  planetCatalog: ReadonlyArray<PlanetCard> = availablePlanets(createPlanetCatalog(), {}),
): AnteSkipOffer {
  const id = rollSkipTag(rng);
  if (id !== "orbital") return { id };
  return { id, orbitalHand: rollOrbitalHand(rng, planetCatalog) };
}

export function rollAnteSkipOffers(
  rng: () => number = Math.random,
  planetCatalog: ReadonlyArray<PlanetCard> = availablePlanets(createPlanetCatalog(), {}),
): AnteSkipOffers {
  return {
    small: rollSkipOffer(rng, planetCatalog),
    big: rollSkipOffer(rng, planetCatalog),
  };
}

export function describeSkipOffer(offer: AnteSkipOffer): {
  readonly name: string;
  readonly description: string;
} {
  const spec = getTagSpec(offer.id);
  if (offer.id === "orbital" && offer.orbitalHand) {
    return {
      name: spec.name,
      description: `Upgrade ${offer.orbitalHand} by 3 levels.`,
    };
  }
  return { name: spec.name, description: spec.description };
}
