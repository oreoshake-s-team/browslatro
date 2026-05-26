import type { Joker, RandomSource } from "./jokers";
import type { PlanetCard } from "./planets";
import type { TarotCard } from "./tarots";
import { JOKER_BASE_PRICE } from "./constants";
import { PLANET_BASE_PRICE } from "./planets";
import { TAROT_BASE_PRICE } from "./tarots";

export const SHOP_OFFER_SLOTS = 3;

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
    }
  | {
      readonly kind: "tarot";
      readonly tarot: TarotCard;
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

export function pickRandomTarot(
  catalog: ReadonlyArray<TarotCard>,
  excludedIds: ReadonlyArray<string>,
  rng: RandomSource = Math.random,
): TarotCard | null {
  return pickRandom(catalog, excludedIds, rng);
}

function jokerOffer(joker: Joker): ShopItem {
  return { kind: "joker", joker, price: JOKER_BASE_PRICE, sold: false };
}

function planetOffer(planet: PlanetCard): ShopItem {
  return { kind: "planet", planet, price: PLANET_BASE_PRICE, sold: false };
}

function tarotOffer(tarot: TarotCard): ShopItem {
  return { kind: "tarot", tarot, price: TAROT_BASE_PRICE, sold: false };
}

export interface PickShopOffersArgs {
  readonly jokerCatalog: ReadonlyArray<Joker>;
  readonly excludedJokerIds: ReadonlyArray<string>;
  readonly planetCatalog: ReadonlyArray<PlanetCard>;
  readonly tarotCatalog: ReadonlyArray<TarotCard>;
  readonly extraSlots?: number;
  readonly rng?: RandomSource;
}

type ShopOfferKind = ShopItem["kind"];
const SHOP_OFFER_KINDS: ReadonlyArray<ShopOfferKind> = ["joker", "planet", "tarot"];

function pickOfferByKind(
  kind: ShopOfferKind,
  args: PickShopOffersArgs,
  rng: RandomSource,
): ShopItem | null {
  switch (kind) {
    case "joker": {
      const next = pickRandom(args.jokerCatalog, args.excludedJokerIds, rng);
      return next ? jokerOffer(next) : null;
    }
    case "planet": {
      const next = pickRandom(args.planetCatalog, [], rng);
      return next ? planetOffer(next) : null;
    }
    case "tarot": {
      const next = pickRandom(args.tarotCatalog, [], rng);
      return next ? tarotOffer(next) : null;
    }
  }
}

export function pickShopOffers(args: PickShopOffersArgs): ReadonlyArray<ShopItem> {
  const rng = args.rng ?? Math.random;
  const slots: ShopItem[] = [];
  for (const kind of SHOP_OFFER_KINDS) {
    const offer = pickOfferByKind(kind, args, rng);
    if (offer) slots.push(offer);
  }
  const extras = Math.max(0, args.extraSlots ?? 0);
  for (let i = 0; i < extras; i += 1) {
    const kind = SHOP_OFFER_KINDS[Math.floor(rng() * SHOP_OFFER_KINDS.length)];
    const offer = pickOfferByKind(kind, args, rng);
    if (offer) slots.push(offer);
  }
  return slots;
}

export function rerollShopOffer(
  current: ShopItem,
  args: PickShopOffersArgs,
): ShopItem | null {
  return pickOfferByKind(current.kind, args, args.rng ?? Math.random);
}
