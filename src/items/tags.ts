import type { NextShopModifier } from "../run/nextShopMods";

export type TagId = "investment" | "d6";

export type TagEffect =
  | { readonly category: "deferred-boss-payout"; readonly amount: number }
  | { readonly category: "immediate" }
  | {
      readonly category: "next-shop";
      readonly modifiers: ReadonlyArray<NextShopModifier>;
    };

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

export interface AnteSkipOffers {
  readonly small: TagId;
  readonly big: TagId;
}

export const tagOfferRngConfig: { rng: () => number } = { rng: Math.random };

export function rollSkipTag(rng: () => number = Math.random): TagId {
  const ids = TAG_SPECS.map((spec) => spec.id);
  const index = Math.min(ids.length - 1, Math.floor(rng() * ids.length));
  return ids[index];
}

export function rollAnteSkipOffers(rng: () => number = Math.random): AnteSkipOffers {
  return { small: rollSkipTag(rng), big: rollSkipTag(rng) };
}
