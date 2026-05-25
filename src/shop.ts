import type { Joker, RandomSource } from "./jokers";
import type { PlanetCard } from "./planets";
import { JOKER_BASE_PRICE } from "./constants";
import { PLANET_BASE_PRICE } from "./planets";

export const SHOP_OFFER_SLOTS = 2;

export const BASE_REROLL_COST = 5;

export type ShopItem =
  | {
      readonly kind: "joker";
      readonly joker: Joker;
      readonly price: number;
      readonly sold: boolean;
    }
  | {
      readonly kind: "planet";
      readonly planet: PlanetCard;
      readonly price: number;
      readonly sold: boolean;
    };

export function rerollCostFor(rerollCount: number): number {
  const safe = rerollCount < 0 ? 0 : Math.floor(rerollCount);
  return BASE_REROLL_COST + safe;
}

function pickRandom<T extends { readonly id: string }>(
  catalog: ReadonlyArray<T>,
  excludedIds: ReadonlyArray<string>,
  rng: RandomSource,
): T | null {
  const excluded = new Set<string>(excludedIds);
  const pool = catalog.filter((item) => !excluded.has(item.id));
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}

export function pickRandomJoker(
  catalog: ReadonlyArray<Joker>,
  excludedIds: ReadonlyArray<string>,
  rng: RandomSource = Math.random,
): Joker | null {
  return pickRandom(catalog, excludedIds, rng);
}

export function pickRandomPlanet(
  catalog: ReadonlyArray<PlanetCard>,
  excludedIds: ReadonlyArray<string>,
  rng: RandomSource = Math.random,
): PlanetCard | null {
  return pickRandom(catalog, excludedIds, rng);
}

function jokerOffer(joker: Joker): ShopItem {
  return { kind: "joker", joker, price: JOKER_BASE_PRICE, sold: false };
}

function planetOffer(planet: PlanetCard): ShopItem {
  return { kind: "planet", planet, price: PLANET_BASE_PRICE, sold: false };
}

export interface PickShopOffersArgs {
  readonly jokerCatalog: ReadonlyArray<Joker>;
  readonly excludedJokerIds: ReadonlyArray<string>;
  readonly planetCatalog: ReadonlyArray<PlanetCard>;
  readonly rng?: RandomSource;
}

export function pickShopOffers(args: PickShopOffersArgs): ReadonlyArray<ShopItem> {
  const rng = args.rng ?? Math.random;
  const joker = pickRandom(args.jokerCatalog, args.excludedJokerIds, rng);
  const planet = pickRandom(args.planetCatalog, [], rng);
  if (joker && planet) return [jokerOffer(joker), planetOffer(planet)];
  if (joker) {
    const fallback = pickRandom(args.jokerCatalog, [...args.excludedJokerIds, joker.id], rng);
    return fallback ? [jokerOffer(joker), jokerOffer(fallback)] : [jokerOffer(joker)];
  }
  if (planet) {
    const fallback = pickRandom(args.planetCatalog, [planet.id], rng);
    return fallback ? [planetOffer(planet), planetOffer(fallback)] : [planetOffer(planet)];
  }
  return [];
}

export function rerollShopOffer(
  current: ShopItem,
  args: PickShopOffersArgs,
): ShopItem | null {
  const rng = args.rng ?? Math.random;
  const joker = (): Joker | null =>
    pickRandom(args.jokerCatalog, args.excludedJokerIds, rng);
  const planet = (): PlanetCard | null => pickRandom(args.planetCatalog, [], rng);
  if (current.kind === "joker") {
    const next = joker();
    if (next) return jokerOffer(next);
    const fb = planet();
    return fb ? planetOffer(fb) : null;
  }
  const next = planet();
  if (next) return planetOffer(next);
  const fb = joker();
  return fb ? jokerOffer(fb) : null;
}
