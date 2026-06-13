import type { Joker } from "./types";

export function clearJokerDisable(jokers: ReadonlyArray<Joker>): Joker[] {
  return jokers.map((j) => (j.disabled ? { ...j, disabled: false } : j));
}

export function disableJokerAt(
  jokers: ReadonlyArray<Joker>,
  index: number,
): Joker[] {
  return jokers.map((j, i) => {
    const disabled = i === index;
    return Boolean(j.disabled) === disabled ? j : { ...j, disabled };
  });
}

export function pickDisabledJokerIndex(
  jokers: ReadonlyArray<Joker>,
  rng: () => number = Math.random,
): number {
  return jokers.length === 0 ? -1 : Math.floor(rng() * jokers.length);
}
