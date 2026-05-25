import type { Joker, RandomSource } from "./jokers";

export const SHOP_OFFER_SLOTS = 2;

export const BASE_REROLL_COST = 5;

export function rerollCostFor(rerollCount: number): number {
  const safe = rerollCount < 0 ? 0 : Math.floor(rerollCount);
  return BASE_REROLL_COST + safe;
}

export function pickShopJokers(
  catalog: ReadonlyArray<Joker>,
  ownedIds: ReadonlyArray<string>,
  slotCount: number,
  rng: RandomSource = Math.random,
): ReadonlyArray<Joker> {
  if (slotCount <= 0) {
    return [];
  }
  const ownedSet = new Set<string>(ownedIds);
  const pool: Joker[] = [];
  for (let i = 0; i < catalog.length; i += 1) {
    const joker = catalog[i];
    if (!ownedSet.has(joker.id)) {
      pool.push(joker);
    }
  }
  const drawCount = Math.min(slotCount, pool.length);
  for (let i = 0; i < drawCount; i += 1) {
    const remaining = pool.length - i;
    const swapIndex = i + Math.floor(rng() * remaining);
    const tmp = pool[i];
    pool[i] = pool[swapIndex];
    pool[swapIndex] = tmp;
  }
  return pool.slice(0, drawCount);
}
