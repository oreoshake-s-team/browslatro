import type { Card } from "../../cards/types";
import type { HandPlayCounts } from "../../components/hud/handPlayCounts";
import { handContains, type HandLabel } from "../../scoring/handEvaluator";
import { rollChance } from "../../dev/chanceOverride";
import { isFaceCardWith } from "./scoring/utils";
import { hasSticker } from "./stickers";
import type { Joker, JokerStateValue, RandomSource } from "./types";

function counterState(value: number): JokerStateValue {
  return { kind: "counter", value };
}

function prevCount(joker: Joker): number {
  return joker.state?.kind === "counter" ? joker.state.value : 0;
}

function isDestructible(joker: Joker): boolean {
  return !hasSticker(joker, "eternal");
}

export function ramenXMultFactor(joker: Joker): number {
  const effect = joker.effect;
  if (effect.kind !== "x-mult-shrink-per-discarded-card") return 1;
  const hundredths =
    Math.round(effect.base * 100) -
    Math.round(effect.lossPerCard * 100) * prevCount(joker);
  return hundredths / 100;
}

export interface HandPlayedContext {
  readonly playedHandLabel: HandLabel;
  readonly playedCardCount: number;
  readonly scoredCards: ReadonlyArray<Card>;
  readonly handPlayCounts?: HandPlayCounts;
}

export function applyHandPlayedToJokerStates(
  jokers: ReadonlyArray<Joker>,
  ctx: HandPlayedContext,
): Joker[] {
  const updated = jokers.map((joker) => {
    const effect = joker.effect;
    switch (effect.kind) {
      case "on-hand-type-stack-mult":
      case "on-hand-type-stack-chips": {
        if (!handContains(ctx.playedHandLabel, effect.requires)) return joker;
        return { ...joker, state: counterState(prevCount(joker) + effect.amount) };
      }
      case "on-played-card-count-stack-chips": {
        if (ctx.playedCardCount !== effect.count) return joker;
        return { ...joker, state: counterState(prevCount(joker) + effect.amount) };
      }
      case "on-played-rank-stack-chips": {
        let matches = 0;
        for (const c of ctx.scoredCards) {
          if (effect.ranks.includes(c.rank)) matches += 1;
        }
        if (matches === 0) return joker;
        return {
          ...joker,
          state: counterState(prevCount(joker) + effect.amount * matches),
        };
      }
      case "on-no-face-stack-mult": {
        const anyFace = ctx.scoredCards.some((c) => isFaceCardWith(c, jokers));
        if (anyFace) return { ...joker, state: counterState(0) };
        return { ...joker, state: counterState(prevCount(joker) + effect.amount) };
      }
      case "every-n-hands-xmult": {
        return { ...joker, state: counterState(prevCount(joker) + 1) };
      }
      case "on-hand-stack-on-discard-shrink-mult": {
        return {
          ...joker,
          state: counterState(prevCount(joker) + effect.growAmount),
        };
      }
      case "x-mult-per-hand-without-most-played": {
        const counts = ctx.handPlayCounts;
        if (counts === undefined) return joker;
        const max = Math.max(...Object.values(counts));
        if (counts[ctx.playedHandLabel] >= max) {
          return { ...joker, state: counterState(0) };
        }
        return { ...joker, state: counterState(prevCount(joker) + 1) };
      }
      case "chips-melt-per-hand": {
        return {
          ...joker,
          state: counterState(Math.max(0, prevCount(joker) - effect.lossPerHand)),
        };
      }
      case "retrigger-all-depleting": {
        return {
          ...joker,
          state: counterState(Math.max(0, prevCount(joker) - 1)),
        };
      }
      default:
        return joker;
    }
  });
  return updated.filter((joker) => {
    if (
      joker.effect.kind !== "chips-melt-per-hand" &&
      joker.effect.kind !== "retrigger-all-depleting"
    ) {
      return true;
    }
    return prevCount(joker) > 0 || !isDestructible(joker);
  });
}

export function applyDiscardToJokerStates(
  jokers: ReadonlyArray<Joker>,
  discardedCards: ReadonlyArray<Card> = [],
): Joker[] {
  const updated = jokers.map((joker) => {
    const effect = joker.effect;
    if (effect.kind === "on-hand-stack-on-discard-shrink-mult") {
      return {
        ...joker,
        state: counterState(Math.max(0, prevCount(joker) - effect.shrinkAmount)),
      };
    }
    if (effect.kind === "x-mult-shrink-per-discarded-card") {
      return {
        ...joker,
        state: counterState(prevCount(joker) + discardedCards.length),
      };
    }
    if (effect.kind === "x-mult-per-jack-discarded-this-round") {
      const jacks = discardedCards.filter((c) => c.rank === "J").length;
      if (jacks === 0) return joker;
      return { ...joker, state: counterState(prevCount(joker) + jacks) };
    }
    return joker;
  });
  return updated.filter(
    (joker) =>
      joker.effect.kind !== "x-mult-shrink-per-discarded-card" ||
      ramenXMultFactor(joker) > 1 ||
      !isDestructible(joker),
  );
}

export function applyShopRerollToJokerStates(
  jokers: ReadonlyArray<Joker>,
): Joker[] {
  return jokers.map((joker) => {
    const effect = joker.effect;
    if (effect.kind !== "stack-mult-on-shop-reroll") return joker;
    return { ...joker, state: counterState(prevCount(joker) + effect.amount) };
  });
}

export function applyPackSkipToJokerStates(
  jokers: ReadonlyArray<Joker>,
): Joker[] {
  return jokers.map((joker) => {
    const effect = joker.effect;
    if (effect.kind !== "stack-mult-on-pack-skip") return joker;
    return { ...joker, state: counterState(prevCount(joker) + effect.amount) };
  });
}

export function applyLuckyTriggersToJokerStates(
  jokers: ReadonlyArray<Joker>,
  triggerCount: number,
): Joker[] {
  if (triggerCount <= 0) return [...jokers];
  return jokers.map((joker) => {
    const effect = joker.effect;
    if (effect.kind !== "x-mult-per-lucky-trigger") return joker;
    return { ...joker, state: counterState(prevCount(joker) + triggerCount) };
  });
}

export function applyEnhancementsEatenToJokerStates(
  jokers: ReadonlyArray<Joker>,
  eatenCount: number,
): Joker[] {
  if (eatenCount <= 0) return [...jokers];
  return jokers.map((joker) => {
    const effect = joker.effect;
    if (effect.kind !== "x-mult-per-enhancement-eaten") return joker;
    return { ...joker, state: counterState(prevCount(joker) + eatenCount) };
  });
}

export function applyConsumableUsedToJokerStates(
  jokers: ReadonlyArray<Joker>,
  kind: "tarot" | "planet" | "spectral",
): Joker[] {
  return jokers.map((joker) => {
    const effect = joker.effect;
    if (effect.kind === "stack-mult-per-tarot-used" && kind === "tarot") {
      return { ...joker, state: counterState(prevCount(joker) + effect.amount) };
    }
    if (effect.kind === "x-mult-per-planet-used" && kind === "planet") {
      return { ...joker, state: counterState(prevCount(joker) + 1) };
    }
    return joker;
  });
}

export function applySellToJokerStates(jokers: ReadonlyArray<Joker>): Joker[] {
  return jokers.map((joker) => {
    const effect = joker.effect;
    if (effect.kind !== "x-mult-per-sold-card") return joker;
    return { ...joker, state: counterState(prevCount(joker) + 1) };
  });
}

export function applyRoundEndToJokerStates(
  jokers: ReadonlyArray<Joker>,
  rng: RandomSource = Math.random,
  bossBlindDefeated = false,
): Joker[] {
  const out: Joker[] = [];
  for (const joker of jokers) {
    const effect = joker.effect;
    if (effect.kind === "mult-decay-per-round") {
      const next = Math.max(0, prevCount(joker) - effect.lossPerRound);
      if (next <= 0 && isDestructible(joker)) continue;
      out.push({ ...joker, state: counterState(next) });
      continue;
    }
    if (
      effect.kind === "additive-mult-chance-bust" ||
      effect.kind === "x-mult-chance-bust"
    ) {
      if (rollChance(effect.bustChance, rng) && isDestructible(joker)) continue;
      out.push(joker);
      continue;
    }
    if (effect.kind === "x-mult-per-jack-discarded-this-round") {
      out.push({ ...joker, state: counterState(0) });
      continue;
    }
    if (effect.kind === "end-of-round-money-grows-on-boss") {
      if (!bossBlindDefeated) {
        out.push(joker);
        continue;
      }
      out.push({ ...joker, state: counterState(prevCount(joker) + effect.growth) });
      continue;
    }
    if (effect.kind === "hand-size-decay-per-round") {
      const next = Math.max(0, prevCount(joker) - effect.lossPerRound);
      if (next <= 0 && isDestructible(joker)) continue;
      out.push({ ...joker, state: counterState(next) });
      continue;
    }
    if (effect.kind === "x-mult-per-sold-card" && bossBlindDefeated) {
      out.push({ ...joker, state: counterState(0) });
      continue;
    }
    if (effect.kind === "sell-value-grows-per-round") {
      out.push({ ...joker, state: counterState(prevCount(joker) + effect.amount) });
      continue;
    }
    out.push(joker);
  }
  return out;
}
