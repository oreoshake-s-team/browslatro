import {
  packOptionsCount,
  packPickLimit,
  type PackPool,
  type PackVariant,
} from "../../items/packs";

const PACK_POOLS: ReadonlyArray<PackPool> = [
  "celestial",
  "arcana",
  "buffoon",
  "spectral",
  "standard",
];

const PACK_VARIANTS: ReadonlyArray<PackVariant> = ["normal", "jumbo", "mega"];

export const PACK_FEATURES = PACK_POOLS.length + PACK_VARIANTS.length + 2;

export const ZERO_PACK_FEATURES: ReadonlyArray<number> = new Array(
  PACK_FEATURES,
).fill(0);

export function packFeatureVector(
  pool: PackPool,
  variant: PackVariant,
): number[] {
  return [
    ...PACK_POOLS.map((p) => (p === pool ? 1 : 0)),
    ...PACK_VARIANTS.map((v) => (v === variant ? 1 : 0)),
    packOptionsCount(pool, variant) / 5,
    packPickLimit(variant) / 2,
  ];
}
