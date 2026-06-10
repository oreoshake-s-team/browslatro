import { cloneJoker, withEdition } from "./editions";
import { canDestroyJoker, isJokerActive } from "./stickers";
import { resolveJokerEffect } from "./scoring/copy";
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
    if (j.effect.kind === "hand-size-decay-per-round") {
      total += j.state?.kind === "counter" ? j.state.value : j.effect.amount;
    }
  }
  return total;
}

export function heldRetriggerCountFromJokers(
  allJokers: ReadonlyArray<Joker>,
): number {
  const jokers = allJokers.filter(isJokerActive);
  let total = 0;
  for (let i = 0; i < jokers.length; i += 1) {
    const effect = resolveJokerEffect(jokers, i);
    if (effect.kind === "retrigger-held-abilities") total += effect.times;
  }
  return total;
}

export function chipsPerScoredCardFromJokers(
  allJokers: ReadonlyArray<Joker>,
): number {
  let total = 0;
  for (const j of allJokers.filter(isJokerActive)) {
    if (j.effect.kind === "scored-cards-gain-chips") total += j.effect.amount;
  }
  return total;
}

export function stoneCardsOnBlindSelectFromJokers(
  allJokers: ReadonlyArray<Joker>,
): number {
  let count = 0;
  for (const j of allJokers.filter(isJokerActive)) {
    if (j.effect.kind === "blind-select-adds-stone-card") count += 1;
  }
  return count;
}

export function interestMultiplierFromJokers(
  jokers: ReadonlyArray<Joker>,
): number {
  let extraStreams = 0;
  for (const j of jokers) {
    if (j.effect.kind === "extra-interest-per-five") extraStreams += 1;
  }
  return 1 + extraStreams;
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

export function hasAstronomerInJokers(
  jokers: ReadonlyArray<Joker>,
): boolean {
  for (const j of jokers) {
    if (j.effect.kind === "passive-run-stats" && j.effect.astronomer === true) {
      return true;
    }
  }
  return false;
}

export function hasChaosTheClownInJokers(
  jokers: ReadonlyArray<Joker>,
): boolean {
  for (const j of jokers) {
    if (
      j.effect.kind === "passive-run-stats" &&
      j.effect.chaosTheClown === true
    ) {
      return true;
    }
  }
  return false;
}

export function handEvalOptionsFromJokers(
  allJokers: ReadonlyArray<Joker>,
): {
  readonly fourFingers?: boolean;
  readonly shortcut?: boolean;
  readonly smearedSuits?: boolean;
} {
  const jokers = allJokers.filter(isJokerActive);
  let fourFingers = false;
  let shortcut = false;
  let smearedSuits = false;
  for (const j of jokers) {
    if (j.effect.kind !== "passive-run-stats") continue;
    if (j.effect.fourFingers === true) fourFingers = true;
    if (j.effect.shortcut === true) shortcut = true;
    if (j.effect.smearedSuits === true) smearedSuits = true;
  }
  const out: {
    fourFingers?: boolean;
    shortcut?: boolean;
    smearedSuits?: boolean;
  } = {};
  if (fourFingers) out.fourFingers = true;
  if (shortcut) out.shortcut = true;
  if (smearedSuits) out.smearedSuits = true;
  return out;
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

export function probabilityMultiplierFromJokers(
  jokers: ReadonlyArray<Joker>,
): number {
  let multiplier = 1;
  for (const j of jokers) {
    if (
      j.effect.kind === "passive-run-stats" &&
      j.effect.probabilityMultiplier !== undefined &&
      j.effect.probabilityMultiplier > 0
    ) {
      multiplier *= j.effect.probabilityMultiplier;
    }
  }
  return multiplier;
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

export function createRandomJoker(
  jokers: ReadonlyArray<Joker>,
  catalog: ReadonlyArray<Joker>,
  capacity: number,
  rng: RandomSource = Math.random,
): Joker | null {
  if (effectiveJokerCount(jokers) >= capacity) return null;
  const ownedIds = new Set(jokers.map((j) => j.id));
  return pickRandomFromCatalog(
    catalog,
    (j) => j.rarity !== "legendary" && !ownedIds.has(j.id),
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
