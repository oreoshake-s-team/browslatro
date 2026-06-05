import { cloneJoker, withEdition } from "./editions";
import { canDestroyJoker } from "./stickers";
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
    if (j.effect.kind === "passive-run-stats" && j.effect.handSize !== undefined) {
      total += j.effect.handSize;
    }
  }
  return total;
}

export function extraStartingDiscardsFromJokers(
  jokers: ReadonlyArray<Joker>,
): number {
  let total = 0;
  for (const j of jokers) {
    if (j.effect.kind === "passive-run-stats" && j.effect.discards !== undefined) {
      total += j.effect.discards;
    }
  }
  return total;
}

export function extraDebtFloorFromJokers(
  jokers: ReadonlyArray<Joker>,
): number {
  let total = 0;
  for (const j of jokers) {
    if (j.effect.kind === "passive-run-stats" && j.effect.debtFloor !== undefined) {
      total += j.effect.debtFloor;
    }
  }
  return total;
}

export function allCardsScoreFromJokers(
  jokers: ReadonlyArray<Joker>,
): boolean {
  for (const j of jokers) {
    if (j.effect.kind === "passive-run-stats" && j.effect.allCardsScore === true) {
      return true;
    }
  }
  return false;
}

export function discardsOverrideFromJokers(
  jokers: ReadonlyArray<Joker>,
): number | null {
  for (const j of jokers) {
    if (
      j.effect.kind === "passive-run-stats" &&
      j.effect.discardsOverride !== undefined
    ) {
      return j.effect.discardsOverride;
    }
  }
  return null;
}

export function extraStartingHandsFromJokers(
  jokers: ReadonlyArray<Joker>,
): number {
  let total = 0;
  for (const j of jokers) {
    if (j.effect.kind === "passive-run-stats" && j.effect.hands !== undefined) {
      total += j.effect.hands;
    }
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

function partitionByDestroyable(
  jokers: ReadonlyArray<Joker>,
): { readonly destroyable: ReadonlyArray<Joker>; readonly kept: ReadonlyArray<Joker> } {
  const destroyable: Joker[] = [];
  const kept: Joker[] = [];
  for (const j of jokers) {
    if (canDestroyJoker(j)) destroyable.push(j);
    else kept.push(j);
  }
  return { destroyable, kept };
}

export function polychromeRandomJokerDestroyOthers(
  jokers: ReadonlyArray<Joker>,
  rng: RandomSource = Math.random,
): Joker[] {
  if (jokers.length === 0) return [];
  const { destroyable, kept } = partitionByDestroyable(jokers);
  if (destroyable.length === 0) return [...jokers];
  const chosen = destroyable[Math.floor(rng() * destroyable.length)];
  return [withEdition(chosen, "polychrome"), ...kept];
}

export function copyRandomJokerDestroyOthers(
  jokers: ReadonlyArray<Joker>,
  rng: RandomSource = Math.random,
): Joker[] {
  if (jokers.length === 0) return [];
  const { destroyable, kept } = partitionByDestroyable(jokers);
  if (destroyable.length === 0) return [...jokers];
  const chosen = destroyable[Math.floor(rng() * destroyable.length)];
  return [chosen, cloneJoker(chosen), ...kept];
}
