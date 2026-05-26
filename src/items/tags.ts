export type TagId = "investment";

export interface TagSpec {
  readonly id: TagId;
  readonly name: string;
  readonly description: string;
}

export const INVESTMENT_TAG_REWARD = 25;

const TAG_SPECS: ReadonlyArray<TagSpec> = [
  {
    id: "investment",
    name: "Investment Tag",
    description: `After defeating the next Boss Blind, gain $${INVESTMENT_TAG_REWARD}.`,
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

export function tagPayout(id: TagId): number {
  if (id === "investment") return INVESTMENT_TAG_REWARD;
  return 0;
}

export function totalTagPayout(ids: ReadonlyArray<TagId>): number {
  return ids.reduce((sum, id) => sum + tagPayout(id), 0);
}
