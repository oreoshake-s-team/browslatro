import type { PlanetCard } from "./planets";
import type { TarotCard } from "./tarots";
import type { RandomSource } from "./jokers";

export type PackPool = "celestial" | "arcana";

export type PackVariant = "normal" | "jumbo" | "mega";

export const PACK_NORMAL_PRICE = 4;
export const PACK_JUMBO_PRICE = 6;
export const PACK_MEGA_PRICE = 8;

export const PACK_POOL_WEIGHTS: Readonly<Record<PackPool, number>> = {
  arcana: 4,
  celestial: 1,
};

export const PACK_VARIANT_WEIGHTS: Readonly<Record<PackVariant, number>> = {
  normal: 0.85,
  jumbo: 0.12,
  mega: 0.03,
};

const PACK_BASE_OPTIONS: Readonly<Record<PackPool, number>> = {
  celestial: 3,
  arcana: 3,
};

const PACK_PICK_LIMIT: Readonly<Record<PackVariant, number>> = {
  normal: 1,
  jumbo: 1,
  mega: 2,
};

const POOL_LABELS: Readonly<Record<PackPool, string>> = {
  celestial: "Celestial",
  arcana: "Arcana",
};

export type PackOption =
  | { readonly kind: "planet"; readonly planet: PlanetCard }
  | { readonly kind: "tarot"; readonly tarot: TarotCard };

export interface PackOffer {
  readonly pool: PackPool;
  readonly variant: PackVariant;
  readonly options: ReadonlyArray<PackOption>;
}

export function packOptionsCount(pool: PackPool, variant: PackVariant): number {
  const base = PACK_BASE_OPTIONS[pool];
  return variant === "normal" ? base : base + 2;
}

export function packPickLimit(variant: PackVariant): number {
  return PACK_PICK_LIMIT[variant];
}

export function packPrice(variant: PackVariant): number {
  if (variant === "normal") return PACK_NORMAL_PRICE;
  if (variant === "jumbo") return PACK_JUMBO_PRICE;
  return PACK_MEGA_PRICE;
}

export function packDisplayName(offer: PackOffer): string {
  const pool = POOL_LABELS[offer.pool];
  if (offer.variant === "normal") return `${pool} Pack`;
  const prefix = offer.variant === "jumbo" ? "Jumbo" : "Mega";
  return `${prefix} ${pool} Pack`;
}

function rollFromWeights<K extends string>(
  weights: Readonly<Record<K, number>>,
  rng: RandomSource,
): K {
  const keys = Object.keys(weights) as K[];
  const total = keys.reduce((sum, k) => sum + weights[k], 0);
  let roll = rng() * total;
  for (const k of keys) {
    roll -= weights[k];
    if (roll <= 0) return k;
  }
  return keys[keys.length - 1];
}

export function rollPackPool(rng: RandomSource): PackPool {
  return rollFromWeights(PACK_POOL_WEIGHTS, rng);
}

export function rollPackVariant(rng: RandomSource): PackVariant {
  return rollFromWeights(PACK_VARIANT_WEIGHTS, rng);
}

export interface RollPackOptionsArgs {
  readonly pool: PackPool;
  readonly variant: PackVariant;
  readonly planetCatalog: ReadonlyArray<PlanetCard>;
  readonly tarotCatalog: ReadonlyArray<TarotCard>;
  readonly rng: RandomSource;
}

export function rollPackOptions(args: RollPackOptionsArgs): ReadonlyArray<PackOption> {
  const want = packOptionsCount(args.pool, args.variant);
  if (args.pool === "celestial") {
    return drawWithoutReplacement(args.planetCatalog, want, args.rng).map((planet) => ({
      kind: "planet" as const,
      planet,
    }));
  }
  if (args.pool === "arcana") {
    return drawWithoutReplacement(args.tarotCatalog, want, args.rng).map((tarot) => ({
      kind: "tarot" as const,
      tarot,
    }));
  }
  return [];
}

function drawWithoutReplacement<T>(
  catalog: ReadonlyArray<T>,
  count: number,
  rng: RandomSource,
): T[] {
  const pool = [...catalog];
  const out: T[] = [];
  while (out.length < count && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

export interface RollPackArgs {
  readonly planetCatalog: ReadonlyArray<PlanetCard>;
  readonly tarotCatalog: ReadonlyArray<TarotCard>;
  readonly rng: RandomSource;
}

export function rollPack(args: RollPackArgs): PackOffer {
  const pool = rollPackPool(args.rng);
  const variant = rollPackVariant(args.rng);
  const options = rollPackOptions({
    pool,
    variant,
    planetCatalog: args.planetCatalog,
    tarotCatalog: args.tarotCatalog,
    rng: args.rng,
  });
  return { pool, variant, options };
}
