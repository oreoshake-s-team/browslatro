import type { Joker } from "./types";

const COPY_EFFECT_KINDS = new Set(["copy-right-joker", "copy-leftmost-joker"]);
const EXTRA_MULTIPLICATIVE_KINDS = new Set(["stencil"]);

const MAX_EXACT_ORDER_JOKERS = 7;

export function producesXMult(joker: Joker): boolean {
  if (joker.edition === "polychrome") return true;
  const kind = joker.effect.kind;
  if (kind.includes("x-mult")) return true;
  return EXTRA_MULTIPLICATIVE_KINDS.has(kind);
}

export function hasCopyJoker(jokers: ReadonlyArray<Joker>): boolean {
  return jokers.some((joker) => COPY_EFFECT_KINDS.has(joker.effect.kind));
}

export function orderJokersForScoring(
  jokers: ReadonlyArray<Joker>,
): ReadonlyArray<Joker> {
  if (hasCopyJoker(jokers)) {
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

function jokerPermutations(
  jokers: ReadonlyArray<Joker>,
): ReadonlyArray<ReadonlyArray<Joker>> {
  if (jokers.length <= 1) return [jokers];
  const result: Joker[][] = [];
  for (let i = 0; i < jokers.length; i += 1) {
    const rest = [...jokers.slice(0, i), ...jokers.slice(i + 1)];
    for (const tail of jokerPermutations(rest)) {
      result.push([jokers[i], ...tail]);
    }
  }
  return result;
}

export function additiveFirstInversions(
  order: ReadonlyArray<Joker>,
): number {
  let multSeen = 0;
  let inversions = 0;
  for (const joker of order) {
    if (producesXMult(joker)) multSeen += 1;
    else inversions += multSeen;
  }
  return inversions;
}

export function chooseOptimalJokerOrder(
  jokers: ReadonlyArray<Joker>,
  scoreOf: (order: ReadonlyArray<Joker>) => number,
): ReadonlyArray<Joker> {
  if (!hasCopyJoker(jokers) || jokers.length > MAX_EXACT_ORDER_JOKERS) {
    return orderJokersForScoring(jokers);
  }
  let best: ReadonlyArray<Joker> | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  let bestInversions = Number.POSITIVE_INFINITY;
  for (const order of jokerPermutations(jokers)) {
    const score = scoreOf(order);
    const inversions = additiveFirstInversions(order);
    if (
      score > bestScore ||
      (score === bestScore && inversions < bestInversions)
    ) {
      best = order;
      bestScore = score;
      bestInversions = inversions;
    }
  }
  return best ?? orderJokersForScoring(jokers);
}
