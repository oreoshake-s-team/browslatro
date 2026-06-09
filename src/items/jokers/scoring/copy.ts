import type { Joker, JokerEffect } from "../types";

export type ResolvedJokerEffect =
  | Exclude<
      JokerEffect,
      { kind: "copy-right-joker" } | { kind: "copy-leftmost-joker" }
    >
  | { readonly kind: "noop" };

const NOOP: ResolvedJokerEffect = { kind: "noop" };

function resolveCopyTarget(
  jokers: ReadonlyArray<Joker>,
  targetIndex: number,
  visited: ReadonlySet<number>,
): ResolvedJokerEffect {
  if (targetIndex < 0 || targetIndex >= jokers.length) {
    return NOOP;
  }
  if (visited.has(targetIndex)) {
    return NOOP;
  }
  return resolveAt(jokers, targetIndex, visited);
}

function resolveAt(
  jokers: ReadonlyArray<Joker>,
  index: number,
  visited: ReadonlySet<number>,
): ResolvedJokerEffect {
  const effect = jokers[index].effect;
  if (effect.kind === "copy-right-joker") {
    return resolveCopyTarget(jokers, index + 1, new Set(visited).add(index));
  }
  if (effect.kind === "copy-leftmost-joker") {
    return resolveCopyTarget(jokers, 0, new Set(visited).add(index));
  }
  return effect;
}

export function resolveJokerEffect(
  jokers: ReadonlyArray<Joker>,
  index: number,
): ResolvedJokerEffect {
  return resolveAt(jokers, index, new Set());
}
