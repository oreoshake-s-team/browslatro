import type { RandomSource } from "./jokers/types";

export function pickRandom<T>(
  items: ReadonlyArray<T>,
  rng: RandomSource = Math.random,
): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(rng() * items.length)];
}

export function pickRandomNonEmpty<T>(
  items: ReadonlyArray<T>,
  rng: RandomSource = Math.random,
): T {
  const picked = pickRandom(items, rng);
  if (picked === undefined) {
    throw new Error("pickRandomNonEmpty: array is empty");
  }
  return picked;
}
