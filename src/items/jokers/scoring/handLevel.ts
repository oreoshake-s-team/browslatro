import { rollChance } from "../../../dev/chanceOverride";
import { handContains } from "../../../scoring/handEvaluator";
import { getRankChips } from "../../../scoring/scoring";
import { effectiveJokerCount } from "../collection";
import {
  FOIL_CHIPS,
  HOLOGRAPHIC_MULT,
  MAX_JOKERS,
  POLYCHROME_X_MULT,
} from "../constants";
import type { Joker } from "../types";
import { resolveJokerEffect } from "./copy";
import type {
  HandLevelContext,
  JokerHandLevelStep,
  JokerHandResult,
} from "./types";
import { assertNeverEffect, isFaceCardWith, jokerSellValue } from "./utils";
import { isJokerActive } from "../stickers";

export function applyHandLevelJokers(
  allJokers: ReadonlyArray<Joker>,
  context: HandLevelContext = {},
): JokerHandResult {
  const jokers = allJokers.filter(isJokerActive);
  let additiveMult = 0;
  let additiveChips = 0;
  let xMult = 1;
  let moneyEarned = 0;
  const fired: string[] = [];
  const steps: JokerHandLevelStep[] = [];

  for (let i = 0; i < jokers.length; i += 1) {
    const joker = jokers[i];
    const effect = resolveJokerEffect(jokers, i);
    switch (effect.kind) {
      case "additive-mult":
      case "additive-mult-chance-bust": {
        additiveMult += effect.amount;
        fired.push(joker.id);
        steps.push({ jokerId: joker.id, jokerName: joker.name, additiveMult: effect.amount });
        break;
      }
      case "on-hand-type-mult": {
        if (
          context.playedHandLabel !== undefined &&
          handContains(context.playedHandLabel, effect.requires)
        ) {
          additiveMult += effect.amount;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveMult: effect.amount });
        }
        break;
      }
      case "on-hand-type-chips": {
        if (
          context.playedHandLabel !== undefined &&
          handContains(context.playedHandLabel, effect.requires)
        ) {
          additiveChips += effect.amount;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveChips: effect.amount });
        }
        break;
      }
      case "on-hand-type-x-mult": {
        if (
          context.playedHandLabel !== undefined &&
          handContains(context.playedHandLabel, effect.requires)
        ) {
          xMult *= effect.amount;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, xMultFactor: effect.amount });
        }
        break;
      }
      case "additive-mult-when-hand-size": {
        if (
          context.playedCardCount !== undefined &&
          context.playedCardCount <= effect.maxCardsPlayed
        ) {
          additiveMult += effect.amount;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveMult: effect.amount });
        }
        break;
      }
      case "additive-mult-random": {
        const rng = context.rng ?? Math.random;
        const span = effect.max - effect.min + 1;
        const rolled = Math.floor(rng() * span) + effect.min;
        additiveMult += rolled;
        fired.push(joker.id);
        steps.push({ jokerId: joker.id, jokerName: joker.name, additiveMult: rolled });
        break;
      }
      case "stencil": {
        const emptySlots = MAX_JOKERS - effectiveJokerCount(jokers);
        if (emptySlots > 0) {
          xMult *= emptySlots;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, xMultFactor: emptySlots });
        }
        break;
      }
      case "per-remaining-discard-chips": {
        const discards = context.remainingDiscards ?? 0;
        const chips = effect.amount * discards;
        if (chips > 0) {
          additiveChips += chips;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveChips: chips });
        }
        break;
      }
      case "mult-when-no-discards": {
        if (context.remainingDiscards === 0) {
          additiveMult += effect.amount;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveMult: effect.amount });
        }
        break;
      }
      case "per-dollar-chips": {
        const money = Math.max(0, context.money ?? 0);
        const chips = effect.amount * money;
        if (chips > 0) {
          additiveChips += chips;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveChips: chips });
        }
        break;
      }
      case "per-held-rank": {
        const held = context.heldInHandCards ?? [];
        let matched = 0;
        for (const card of held) {
          if (effect.ranks.includes(card.rank)) matched += 1;
        }
        if (matched > 0) {
          fired.push(joker.id);
          if (effect.mult !== undefined) {
            const total = effect.mult * matched;
            additiveMult += total;
            steps.push({ jokerId: joker.id, jokerName: joker.name, additiveMult: total });
          }
          if (effect.xMult !== undefined) {
            const factor = effect.xMult ** matched;
            xMult *= factor;
            steps.push({ jokerId: joker.id, jokerName: joker.name, xMultFactor: factor });
          }
        }
        break;
      }
      case "held-lowest-rank-mult": {
        const held = context.heldInHandCards ?? [];
        if (held.length > 0) {
          let lowest = getRankChips(held[0].rank);
          for (let h = 1; h < held.length; h += 1) {
            const value = getRankChips(held[h].rank);
            if (value < lowest) lowest = value;
          }
          const bonus = effect.multiplier * lowest;
          additiveMult += bonus;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveMult: bonus });
        }
        break;
      }
      case "per-joker-count-mult": {
        const bonus = effect.amount * jokers.length;
        if (bonus > 0) {
          additiveMult += bonus;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveMult: bonus });
        }
        break;
      }
      case "per-money-bucket-mult": {
        const money = Math.max(0, context.money ?? 0);
        const buckets = Math.floor(money / effect.bucket);
        const bonus = effect.amount * buckets;
        if (bonus > 0) {
          additiveMult += bonus;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveMult: bonus });
        }
        break;
      }
      case "x-mult-when-held-suits-all-in": {
        const held = context.heldInHandCards ?? [];
        const allMatch = held.every((c) => effect.suits.includes(c.suit));
        if (allMatch) {
          xMult *= effect.amount;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, xMultFactor: effect.amount });
        }
        break;
      }
      case "other-jokers-sell-value-mult": {
        let total = 0;
        for (let k = 0; k < jokers.length; k += 1) {
          if (k !== i) total += jokerSellValue(jokers[k]);
        }
        if (total > 0) {
          additiveMult += total;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveMult: total });
        }
        break;
      }
      case "per-held-face-chance-money": {
        const held = context.heldInHandCards ?? [];
        const rng = context.rng ?? Math.random;
        let earned = 0;
        for (const c of held) {
          if (isFaceCardWith(c, jokers) && rollChance(effect.chance, rng)) {
            earned += effect.payout;
          }
        }
        if (earned > 0) {
          moneyEarned += earned;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, moneyEarned: earned });
        }
        break;
      }
      case "x-mult-on-final-hand": {
        if (context.remainingHands === 1) {
          xMult *= effect.amount;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, xMultFactor: effect.amount });
        }
        break;
      }
      case "per-enhanced-in-deck-chips": {
        const deck = context.fullDeck ?? [];
        let matches = 0;
        for (const c of deck) if (c.enhancement === effect.enhancement) matches += 1;
        const chips = effect.amount * matches;
        if (chips > 0) {
          additiveChips += chips;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveChips: chips });
        }
        break;
      }
      case "per-enhanced-in-deck-x-mult": {
        const deck = context.fullDeck ?? [];
        let matches = 0;
        for (const c of deck) if (c.enhancement === effect.enhancement) matches += 1;
        if (matches > 0) {
          const factor = 1 + effect.amount * matches;
          xMult *= factor;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, xMultFactor: factor });
        }
        break;
      }
      case "x-mult-when-enhanced-count-at-least": {
        const deck = context.fullDeck ?? [];
        let enhancedCount = 0;
        for (const c of deck) if (c.enhancement !== undefined) enhancedCount += 1;
        if (enhancedCount >= effect.threshold) {
          xMult *= effect.amount;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, xMultFactor: effect.amount });
        }
        break;
      }
      case "per-missing-card-mult": {
        if (context.fullDeck === undefined) break;
        if (context.baseDeckSize === undefined) break;
        const missing = Math.max(
          0,
          context.baseDeckSize - context.fullDeck.length,
        );
        if (missing > 0) {
          const bonus = effect.amount * missing;
          additiveMult += bonus;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveMult: bonus });
        }
        break;
      }
      case "per-remaining-deck-card-chips": {
        const remaining = context.remainingDeck ?? [];
        if (remaining.length > 0) {
          const bonus = effect.amount * remaining.length;
          additiveChips += bonus;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveChips: bonus });
        }
        break;
      }
      case "x-mult-per-uncommon-joker": {
        let uncommonCount = 0;
        for (let k = 0; k < jokers.length; k += 1) {
          if (k === i) continue;
          if (jokers[k].rarity === "uncommon") uncommonCount += 1;
        }
        if (uncommonCount > 0) {
          const factor = Math.pow(1 + effect.amount, uncommonCount);
          xMult *= factor;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, xMultFactor: factor });
        }
        break;
      }
      case "all-suits-x-mult": {
        const scored = context.scoredCards ?? [];
        const suits = new Set<string>();
        for (const c of scored) suits.add(c.suit);
        if (
          suits.has("spades") &&
          suits.has("hearts") &&
          suits.has("diamonds") &&
          suits.has("clubs")
        ) {
          xMult *= effect.amount;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, xMultFactor: effect.amount });
        }
        break;
      }
      case "x-mult-when-clubs-and-other-suit": {
        const scored = context.scoredCards ?? [];
        let hasClub = false;
        let hasOther = false;
        for (const c of scored) {
          if (c.suit === "clubs") hasClub = true;
          else hasOther = true;
          if (hasClub && hasOther) break;
        }
        if (hasClub && hasOther) {
          xMult *= effect.amount;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, xMultFactor: effect.amount });
        }
        break;
      }
      case "passive-run-stats": {
        if (effect.additiveChips !== undefined && effect.additiveChips > 0) {
          additiveChips += effect.additiveChips;
          fired.push(joker.id);
          steps.push({
            jokerId: joker.id,
            jokerName: joker.name,
            additiveChips: effect.additiveChips,
          });
        }
        break;
      }
      case "per-hand-play-count-mult": {
        const counts = context.handPlayCounts;
        const label = context.playedHandLabel;
        if (counts !== undefined && label !== undefined) {
          const bonus = counts[label];
          if (bonus > 0) {
            additiveMult += bonus;
            fired.push(joker.id);
            steps.push({
              jokerId: joker.id,
              jokerName: joker.name,
              additiveMult: bonus,
            });
          }
        }
        break;
      }
      case "on-hand-type-stack-mult":
      case "on-hand-stack-on-discard-shrink-mult":
      case "stack-mult-on-shop-reroll":
      case "mult-decay-per-round": {
        const bonus = joker.state?.kind === "counter" ? joker.state.value : 0;
        if (bonus > 0) {
          additiveMult += bonus;
          fired.push(joker.id);
          steps.push({
            jokerId: joker.id,
            jokerName: joker.name,
            additiveMult: bonus,
          });
        }
        break;
      }
      case "on-hand-type-stack-chips":
      case "on-played-card-count-stack-chips":
      case "on-played-rank-stack-chips":
      case "chips-melt-per-hand": {
        const bonus = joker.state?.kind === "counter" ? joker.state.value : 0;
        if (bonus > 0) {
          additiveChips += bonus;
          fired.push(joker.id);
          steps.push({
            jokerId: joker.id,
            jokerName: joker.name,
            additiveChips: bonus,
          });
        }
        break;
      }
      case "on-no-face-stack-mult": {
        const bonus = joker.state?.kind === "counter" ? joker.state.value : 0;
        if (bonus > 0) {
          additiveMult += bonus;
          fired.push(joker.id);
          steps.push({
            jokerId: joker.id,
            jokerName: joker.name,
            additiveMult: bonus,
          });
        }
        break;
      }
      case "x-mult-on-repeat-hand-this-round": {
        const label = context.playedHandLabel;
        if (
          label !== undefined &&
          context.handLabelsThisRound !== undefined &&
          context.handLabelsThisRound.includes(label)
        ) {
          xMult *= effect.amount;
          fired.push(joker.id);
          steps.push({
            jokerId: joker.id,
            jokerName: joker.name,
            xMultFactor: effect.amount,
          });
        }
        break;
      }
      case "x-mult-per-blind-skipped": {
        const skips = context.blindsSkipped ?? 0;
        if (skips > 0) {
          const factor = 1 + effect.amount * skips;
          xMult *= factor;
          fired.push(joker.id);
          steps.push({
            jokerId: joker.id,
            jokerName: joker.name,
            xMultFactor: factor,
          });
        }
        break;
      }
      case "x-mult-per-added-card": {
        const added = context.addedCardsCount ?? 0;
        if (added > 0) {
          const factor = 1 + effect.amount * added;
          xMult *= factor;
          fired.push(joker.id);
          steps.push({
            jokerId: joker.id,
            jokerName: joker.name,
            xMultFactor: factor,
          });
        }
        break;
      }
      case "x-mult-shrink-per-discarded-card": {
        const discarded = joker.state?.kind === "counter" ? joker.state.value : 0;
        const hundredths =
          Math.round(effect.base * 100) -
          Math.round(effect.lossPerCard * 100) * discarded;
        const factor = Math.max(100, hundredths) / 100;
        if (factor > 1) {
          xMult *= factor;
          fired.push(joker.id);
          steps.push({
            jokerId: joker.id,
            jokerName: joker.name,
            xMultFactor: factor,
          });
        }
        break;
      }
      case "every-n-hands-xmult": {
        const counter = joker.state?.kind === "counter" ? joker.state.value : 0;
        if (counter > 0 && counter % effect.n === 0) {
          xMult *= effect.xmult;
          fired.push(joker.id);
          steps.push({
            jokerId: joker.id,
            jokerName: joker.name,
            xMultFactor: effect.xmult,
          });
        }
        break;
      }
      case "business-card":
      case "per-suit-mult":
      case "per-scored-rank-parity":
      case "per-scored-face":
      case "x-mult-on-face-scored":
      case "per-scored-rank":
      case "per-suit-chance-x-mult":
      case "per-scored-rank-x-mult":
      case "per-suit-chips":
      case "per-suit-money":
      case "end-of-round-money":
      case "per-remaining-discard-end-of-round-money":
      case "per-rank-in-deck-end-of-round-money":
      case "on-discard-money-when-face-count-at-least":
      case "on-first-discard-of-round-money-when-size":
      case "noop":
        break;
      default:
        assertNeverEffect(effect);
    }
    if (joker.edition !== undefined && joker.edition !== "negative") {
      switch (joker.edition) {
        case "foil": {
          additiveChips += FOIL_CHIPS;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveChips: FOIL_CHIPS });
          break;
        }
        case "holographic": {
          additiveMult += HOLOGRAPHIC_MULT;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveMult: HOLOGRAPHIC_MULT });
          break;
        }
        case "polychrome": {
          xMult *= POLYCHROME_X_MULT;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, xMultFactor: POLYCHROME_X_MULT });
          break;
        }
      }
    }
  }

  return { additiveMult, additiveChips, xMult, moneyEarned, firedJokerIds: fired, steps };
}
