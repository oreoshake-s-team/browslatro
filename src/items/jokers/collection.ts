import { cloneJoker, withEdition } from "./editions";
import type { Joker, JokerRarity, RandomSource } from "./types";

export function effectiveJokerCount(jokers: ReadonlyArray<Joker>): number {
  let count = 0;
  for (const j of jokers) if (j.edition !== "negative") count += 1;
  return count;
}

export function extraStartingHandSizeFromJokers(
  jokers: ReadonlyArray<Joker>,
): number {
  let total = 0;
  for (const j of jokers) {
    if (j.effect.kind === "passive-hand-size") total += j.effect.amount;
  }
  return total;
}

export function extraStartingDiscardsFromJokers(
  jokers: ReadonlyArray<Joker>,
): number {
  let total = 0;
  for (const j of jokers) {
    if (j.effect.kind === "passive-starting-discards") total += j.effect.amount;
  }
  return total;
}

export function pickRandomEquipped(
  jokers: ReadonlyArray<Joker>,
  rng: RandomSource = Math.random,
): Joker | null {
  if (jokers.length === 0) return null;
  return jokers[Math.floor(rng() * jokers.length)];
}

export function pickRandomFromCatalog(
  catalog: ReadonlyArray<Joker>,
  filter: (j: Joker) => boolean,
  rng: RandomSource = Math.random,
): Joker | null {
  const pool = catalog.filter(filter);
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}

export function createJokerByRarity(
  jokers: ReadonlyArray<Joker>,
  catalog: ReadonlyArray<Joker>,
  rarity: JokerRarity,
  capacity: number,
  rng: RandomSource = Math.random,
): Joker | null {
  if (effectiveJokerCount(jokers) >= capacity) return null;
  const ownedIds = new Set(jokers.map((j) => j.id));
  return pickRandomFromCatalog(
    catalog,
    (j) => j.rarity === rarity && !ownedIds.has(j.id),
    rng,
  );
}

export function replaceJokersExceptCopyOf(
  jokers: ReadonlyArray<Joker>,
  idx: number,
): Joker[] {
  if (idx < 0 || idx >= jokers.length) return [...jokers];
  return [cloneJoker(jokers[idx])];
}

export function polychromeRandomJokerDestroyOthers(
  jokers: ReadonlyArray<Joker>,
  rng: RandomSource = Math.random,
): Joker[] {
  if (jokers.length === 0) return [];
  const idx = Math.floor(rng() * jokers.length);
  return [withEdition(jokers[idx], "polychrome")];
}

export function copyRandomJokerDestroyOthers(
  jokers: ReadonlyArray<Joker>,
  rng: RandomSource = Math.random,
): Joker[] {
  if (jokers.length === 0) return [];
  const idx = Math.floor(rng() * jokers.length);
  const chosen = jokers[idx];
  return [chosen, cloneJoker(chosen)];
}
