import type { Card } from "../../../cards/types";
import { rollChance } from "../../../dev/chanceOverride";
import { RANK_PARITY } from "../constants";
import type { Joker, RandomSource } from "../types";
import type {
  JokerCardResult,
  JokerCardStep,
  PerCardContext,
} from "./types";
import { assertNeverEffect, isFaceCard } from "./utils";

export function applyPerCardJokers(
  jokers: ReadonlyArray<Joker>,
  card: Card,
  rng: RandomSource = Math.random,
  context: PerCardContext = {},
): JokerCardResult {
  let moneyEarned = 0;
  let additiveMult = 0;
  let additiveChips = 0;
  let xMult = 1;
  const fired: string[] = [];
  const steps: JokerCardStep[] = [];

  for (let i = 0; i < jokers.length; i += 1) {
    const joker = jokers[i];
    const effect = joker.effect;
    switch (effect.kind) {
      case "business-card": {
        if (isFaceCard(card) && rollChance(effect.chance, rng)) {
          moneyEarned += effect.payout;
          fired.push(joker.id);
          steps.push({
            jokerId: joker.id,
            jokerName: joker.name,
            moneyEarned: effect.payout,
          });
        }
        break;
      }
      case "per-suit-mult": {
        if (card.suit === effect.suit) {
          additiveMult += effect.amount;
          fired.push(joker.id);
          steps.push({
            jokerId: joker.id,
            jokerName: joker.name,
            additiveMult: effect.amount,
          });
        }
        break;
      }
      case "per-suit-chance-x-mult": {
        if (card.suit === effect.suit && rollChance(effect.chance, rng)) {
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
      case "per-suit-chips": {
        if (card.suit === effect.suit) {
          additiveChips += effect.amount;
          fired.push(joker.id);
          steps.push({
            jokerId: joker.id,
            jokerName: joker.name,
            additiveChips: effect.amount,
          });
        }
        break;
      }
      case "per-suit-money": {
        if (card.suit === effect.suit) {
          moneyEarned += effect.amount;
          fired.push(joker.id);
          steps.push({
            jokerId: joker.id,
            jokerName: joker.name,
            moneyEarned: effect.amount,
          });
        }
        break;
      }
      case "per-scored-rank-parity": {
        if (RANK_PARITY[card.rank] === effect.parity) {
          if (effect.contribution.kind === "mult") {
            additiveMult += effect.contribution.amount;
            steps.push({
              jokerId: joker.id,
              jokerName: joker.name,
              additiveMult: effect.contribution.amount,
            });
          } else {
            additiveChips += effect.contribution.amount;
            steps.push({
              jokerId: joker.id,
              jokerName: joker.name,
              additiveChips: effect.contribution.amount,
            });
          }
          fired.push(joker.id);
        }
        break;
      }
      case "per-scored-face": {
        if (isFaceCard(card)) {
          if (effect.contribution.kind === "mult") {
            additiveMult += effect.contribution.amount;
            steps.push({
              jokerId: joker.id,
              jokerName: joker.name,
              additiveMult: effect.contribution.amount,
            });
          } else {
            additiveChips += effect.contribution.amount;
            steps.push({
              jokerId: joker.id,
              jokerName: joker.name,
              additiveChips: effect.contribution.amount,
            });
          }
          fired.push(joker.id);
        }
        break;
      }
      case "x-mult-on-face-scored": {
        if (isFaceCard(card) && !context.firstFaceAlreadyScored) {
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
      case "per-scored-rank": {
        if (effect.ranks.includes(card.rank)) {
          if (effect.mult !== undefined) additiveMult += effect.mult;
          if (effect.chips !== undefined) additiveChips += effect.chips;
          fired.push(joker.id);
          steps.push({
            jokerId: joker.id,
            jokerName: joker.name,
            ...(effect.mult !== undefined ? { additiveMult: effect.mult } : {}),
            ...(effect.chips !== undefined ? { additiveChips: effect.chips } : {}),
          });
        }
        break;
      }
      case "per-scored-rank-x-mult": {
        if (effect.ranks.includes(card.rank)) {
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
      case "additive-mult":
      case "stencil":
      case "on-hand-type-mult":
      case "on-hand-type-chips":
      case "on-hand-type-x-mult":
      case "additive-mult-when-hand-size":
      case "additive-mult-random":
      case "per-remaining-discard-chips":
      case "mult-when-no-discards":
      case "per-dollar-chips":
      case "per-held-rank":
      case "held-lowest-rank-mult":
      case "per-joker-count-mult":
      case "per-money-bucket-mult":
      case "x-mult-when-held-suits-all-in":
      case "other-jokers-sell-value-mult":
      case "per-held-face-chance-money":
      case "x-mult-on-final-hand":
      case "end-of-round-money":
      case "per-remaining-discard-end-of-round-money":
      case "per-rank-in-deck-end-of-round-money":
      case "per-enhanced-in-deck-chips":
      case "per-enhanced-in-deck-x-mult":
      case "x-mult-when-enhanced-count-at-least":
      case "per-missing-card-mult":
      case "per-remaining-deck-card-chips":
      case "x-mult-per-uncommon-joker":
      case "all-suits-x-mult":
      case "x-mult-when-clubs-and-other-suit":
      case "on-discard-money-when-face-count-at-least":
      case "on-first-discard-of-round-money-when-size":
        break;
      default:
        assertNeverEffect(effect);
    }
  }

  return {
    moneyEarned,
    additiveMult,
    additiveChips,
    xMult,
    firedJokerIds: fired,
    steps,
  };
}
