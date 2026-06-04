// @vitest-environment node
import {
  TRADING_CARD_DISCARD_SIZE,
  TRADING_CARD_PAYOUT,
  applyEndOfRoundJokers,
  applyHandLevelJokers,
  applyOnDiscardJokers,
  applyPerCardJokers,
  createTradingCardJoker,
} from "../jokers";
import type { JokerRarity } from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("Trading Card", () => {
  test("pays TRADING_CARD_PAYOUT on the first discard of the round when exactly the configured size", () => {
    const discarded = [card("9")];
    const result = applyOnDiscardJokers([createTradingCardJoker()], discarded, {
      discardsUsedThisRound: 1,
    });
    expect(result.moneyEarned).toBe(TRADING_CARD_PAYOUT);
  });

  test("emits a single step crediting Trading Card with the payout and destroyedCardId", () => {
    const discarded = [card("9")];
    const result = applyOnDiscardJokers([createTradingCardJoker()], discarded, {
      discardsUsedThisRound: 1,
    });
    expect(result.steps).toEqual([
      {
        jokerId: "trading-card",
        jokerName: "Trading Card",
        moneyEarned: TRADING_CARD_PAYOUT,
        destroyedCardId: discarded[0].id,
      },
    ]);
  });

  test("destroyedCardId reflects the id of the discarded card", () => {
    const discarded = [card("K", "hearts")];
    const result = applyOnDiscardJokers([createTradingCardJoker()], discarded, {
      discardsUsedThisRound: 1,
    });
    expect(result.steps[0].destroyedCardId).toBe(discarded[0].id);
  });

  test("pays nothing when the first discard of the round is more than the configured size (negative)", () => {
    const discarded = [card("9"), card("J")];
    const result = applyOnDiscardJokers([createTradingCardJoker()], discarded, {
      discardsUsedThisRound: 1,
    });
    expect(result.moneyEarned).toBe(0);
  });

  test("does not fire when the first discard is the wrong size (negative)", () => {
    const discarded = [card("9"), card("J")];
    const result = applyOnDiscardJokers([createTradingCardJoker()], discarded, {
      discardsUsedThisRound: 1,
    });
    expect(result.steps).toEqual([]);
  });

  test("pays nothing on the second discard of the round even at the configured size (negative)", () => {
    const discarded = [card("9")];
    const result = applyOnDiscardJokers([createTradingCardJoker()], discarded, {
      discardsUsedThisRound: 2,
    });
    expect(result.moneyEarned).toBe(0);
  });

  test("pays nothing when discardsUsedThisRound is missing from context", () => {
    const discarded = [card("9")];
    const result = applyOnDiscardJokers(
      [createTradingCardJoker()],
      discarded,
      {},
    );
    expect(result.moneyEarned).toBe(0);
  });

  test("only treats discardsUsedThisRound === 1 as the first discard (negative)", () => {
    const discarded = [card("9")];
    const result = applyOnDiscardJokers([createTradingCardJoker()], discarded, {
      discardsUsedThisRound: 0,
    });
    expect(result.moneyEarned).toBe(0);
  });

  test("payout is independent of which rank is discarded, as long as the size matches", () => {
    const discarded = [card("K")];
    const result = applyOnDiscardJokers([createTradingCardJoker()], discarded, {
      discardsUsedThisRound: 1,
    });
    expect(result.moneyEarned).toBe(TRADING_CARD_PAYOUT);
  });

  test("matches exactly TRADING_CARD_DISCARD_SIZE cards (1 in canonical Balatro)", () => {
    expect(TRADING_CARD_DISCARD_SIZE).toBe(1);
  });

  test("does not contribute in the hand-level pass", () => {
    const result = applyHandLevelJokers([createTradingCardJoker()]);
    expect(result.firedJokerIds).toEqual([]);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers([createTradingCardJoker()], card("9"));
    expect(result.firedJokerIds).toEqual([]);
  });

  test("does not contribute in the end-of-round pass", () => {
    const result = applyEndOfRoundJokers([createTradingCardJoker()]);
    expect(result.moneyEarned).toBe(0);
  });

  test("is an uncommon joker", () => {
    expect(createTradingCardJoker().rarity).toBe<JokerRarity>("uncommon");
  });
});
