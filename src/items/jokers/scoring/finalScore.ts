import type { Card } from "../../../cards/types";
import type { Joker, RandomSource } from "../types";
import { applyHandLevelJokers } from "./handLevel";
import { applyPerCardJokers } from "./perCard";
import type { HandLevelContext, JokerScoringResult } from "./types";
import { isFaceCard } from "./utils";

export function applyJokersToScoring(
  jokers: ReadonlyArray<Joker>,
  scoredCards: ReadonlyArray<Card>,
  rng: RandomSource = Math.random,
  context: HandLevelContext = {},
): JokerScoringResult {
  const handResult = applyHandLevelJokers(jokers, {
    ...context,
    scoredCards: context.scoredCards ?? scoredCards,
  });
  let moneyEarned = handResult.moneyEarned;
  let perCardAdditiveMult = 0;
  let perCardAdditiveChips = 0;
  let perCardXMult = 1;
  let firstFaceAlreadyScored = false;
  for (let c = 0; c < scoredCards.length; c += 1) {
    const cardResult = applyPerCardJokers(jokers, scoredCards[c], rng, {
      firstFaceAlreadyScored,
    });
    moneyEarned += cardResult.moneyEarned;
    perCardAdditiveMult += cardResult.additiveMult;
    perCardAdditiveChips += cardResult.additiveChips;
    perCardXMult *= cardResult.xMult;
    if (isFaceCard(scoredCards[c])) firstFaceAlreadyScored = true;
  }
  return {
    additiveMult: handResult.additiveMult + perCardAdditiveMult,
    additiveChips: handResult.additiveChips + perCardAdditiveChips,
    xMult: handResult.xMult * perCardXMult,
    moneyEarned,
  };
}

export function computeFinalScoreWithJokers(
  baseHandChips: number,
  baseHandMultiplier: number,
  cardChipsTotal: number,
  jokerResult: JokerScoringResult,
): number {
  const chipsTotal = baseHandChips + cardChipsTotal + jokerResult.additiveChips;
  const mult = (baseHandMultiplier + jokerResult.additiveMult) * jokerResult.xMult;
  return Math.floor(chipsTotal * mult);
}
