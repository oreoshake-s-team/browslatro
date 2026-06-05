import type { PlanetCard } from "./planets";
import type { TarotCard } from "./tarots";
import type { SpectralCard } from "./spectrals";
import type { Joker, RandomSource } from "./jokers";
import type { Card, Enhancement } from "../cards/types";
import { ENHANCEMENT_KINDS } from "../cards/enhancements";
import { SEAL_KINDS } from "../cards/seals";
import { RANKS, SUITS, nextCardId } from "../cards/deck";
import { rollChance } from "../dev/chanceOverride";

export type PackPool = "celestial" | "arcana" | "buffoon" | "spectral" | "standard";

export const STANDARD_ENHANCEMENT_CHANCE = 0.4;
export const STANDARD_SEAL_CHANCE = 0.2;

const STANDARD_ENHANCEMENT_POOL: ReadonlyArray<Enhancement> = ENHANCEMENT_KINDS.filter(
  (e) => e !== "stone",
);

export type PackVariant = "normal" | "jumbo" | "mega";

export const PACK_NORMAL_PRICE = 4;
export const PACK_JUMBO_PRICE = 6;
export const PACK_MEGA_PRICE = 8;

export const PACK_POOL_WEIGHTS: Readonly<Record<PackPool, number>> = {
  arcana: 4,
  celestial: 1,
  buffoon: 1,
  standard: 4,
  spectral: 0.25,
};

export const PACK_VARIANT_WEIGHTS: Readonly<Record<PackVariant, number>> = {
  normal: 0.85,
  jumbo: 0.12,
  mega: 0.03,
};

const PACK_BASE_OPTIONS: Readonly<Record<PackPool, number>> = {
  celestial: 3,
  arcana: 3,
  buffoon: 2,
  spectral: 2,
  standard: 3,
};

const PACK_PICK_LIMIT: Readonly<Record<PackVariant, number>> = {
  normal: 1,
  jumbo: 1,
  mega: 2,
};

const POOL_LABELS: Readonly<Record<PackPool, string>> = {
  celestial: "Celestial",
  arcana: "Arcana",
  buffoon: "Buffoon",
  spectral: "Spectral",
  standard: "Standard",
};

export type PackOption =
  | { readonly kind: "planet"; readonly planet: PlanetCard }
  | { readonly kind: "tarot"; readonly tarot: TarotCard }
  | { readonly kind: "joker"; readonly joker: Joker }
  | { readonly kind: "spectral"; readonly spectral: SpectralCard }
  | { readonly kind: "playing-card"; readonly card: Card };

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
  readonly jokerCatalog: ReadonlyArray<Joker>;
  readonly spectralCatalog: ReadonlyArray<SpectralCard>;
  readonly excludedJokerIds?: ReadonlyArray<string>;
  readonly guaranteedPlanetId?: string;
  readonly rng: RandomSource;
}

export function rollPackOptions(args: RollPackOptionsArgs): ReadonlyArray<PackOption> {
  const want = packOptionsCount(args.pool, args.variant);
  if (args.pool === "celestial") {
    const guaranteed = args.guaranteedPlanetId
      ? args.planetCatalog.find((p) => p.id === args.guaranteedPlanetId) ?? null
      : null;
    if (guaranteed && want >= 1) {
      const rest = drawWithoutReplacement(
        args.planetCatalog.filter((p) => p.id !== guaranteed.id),
        want - 1,
        args.rng,
      );
      return [guaranteed, ...rest].map((planet) => ({
        kind: "planet" as const,
        planet,
      }));
    }
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
  if (args.pool === "buffoon") {
    const excluded = new Set(args.excludedJokerIds ?? []);
    const eligible = args.jokerCatalog.filter((j) => !excluded.has(j.id));
    return drawWithoutReplacement(eligible, want, args.rng).map((joker) => ({
      kind: "joker" as const,
      joker,
    }));
  }
  if (args.pool === "spectral") {
    return drawWithoutReplacement(args.spectralCatalog, want, args.rng).map((spectral) => ({
      kind: "spectral" as const,
      spectral,
    }));
  }
  if (args.pool === "standard") {
    const out: PackOption[] = [];
    for (let i = 0; i < want; i += 1) {
      out.push({ kind: "playing-card", card: rollStandardCard(args.rng) });
    }
    return out;
  }
  return [];
}

export function rollStandardCard(rng: RandomSource): Card {
  const rank = RANKS[Math.floor(rng() * RANKS.length)];
  const suit = SUITS[Math.floor(rng() * SUITS.length)];
  const enhancement = rollChance(STANDARD_ENHANCEMENT_CHANCE, rng)
    ? STANDARD_ENHANCEMENT_POOL[
        Math.floor(rng() * STANDARD_ENHANCEMENT_POOL.length)
      ]
    : undefined;
  const seal = rollChance(STANDARD_SEAL_CHANCE, rng)
    ? SEAL_KINDS[Math.floor(rng() * SEAL_KINDS.length)]
    : undefined;
  return {
    id: nextCardId(),
    rank,
    suit,
    ...(enhancement !== undefined ? { enhancement } : {}),
    ...(seal !== undefined ? { seal } : {}),
  };
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
  readonly jokerCatalog: ReadonlyArray<Joker>;
  readonly spectralCatalog: ReadonlyArray<SpectralCard>;
  readonly excludedJokerIds?: ReadonlyArray<string>;
  readonly guaranteedPlanetId?: string;
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
    jokerCatalog: args.jokerCatalog,
    spectralCatalog: args.spectralCatalog,
    excludedJokerIds: args.excludedJokerIds,
    guaranteedPlanetId: args.guaranteedPlanetId,
    rng: args.rng,
  });
  return { pool, variant, options };
}

export function rollPackForPool(
  pool: PackPool,
  args: RollPackArgs,
  variant: PackVariant = "normal",
): PackOffer {
  const options = rollPackOptions({
    pool,
    variant,
    planetCatalog: args.planetCatalog,
    tarotCatalog: args.tarotCatalog,
    jokerCatalog: args.jokerCatalog,
    spectralCatalog: args.spectralCatalog,
    excludedJokerIds: args.excludedJokerIds,
    guaranteedPlanetId: args.guaranteedPlanetId,
    rng: args.rng,
  });
  return { pool, variant, options };
}
