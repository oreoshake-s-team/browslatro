import type { Joker } from "./types";

const COPY_EFFECT_KINDS = new Set(["copy-right-joker", "copy-leftmost-joker"]);
const EXTRA_MULTIPLICATIVE_KINDS = new Set(["stencil"]);

export function producesXMult(joker: Joker): boolean {
  if (joker.edition === "polychrome") return true;
  const kind = joker.effect.kind;
  if (kind.includes("x-mult")) return true;
  return EXTRA_MULTIPLICATIVE_KINDS.has(kind);
}

export function orderJokersForScoring(
  jokers: ReadonlyArray<Joker>,
): ReadonlyArray<Joker> {
  if (jokers.some((joker) => COPY_EFFECT_KINDS.has(joker.effect.kind))) {
    return jokers;
  }
  const additive: Joker[] = [];
  const multiplicative: Joker[] = [];
  for (const joker of jokers) {
    if (producesXMult(joker)) multiplicative.push(joker);
    else additive.push(joker);
  }
  return [...additive, ...multiplicative];
}
