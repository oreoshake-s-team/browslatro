export type TagId = "investment";

export type TagEffect =
  | { readonly category: "deferred-boss-payout"; readonly amount: number }
  | { readonly category: "immediate" }
  | { readonly category: "next-shop" };

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
