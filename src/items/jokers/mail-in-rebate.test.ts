// @vitest-environment node
import {
  MAIL_IN_REBATE_PAYOUT,
  applyOnDiscardJokers,
  createJokerCatalog,
  createMailInRebateJoker,
} from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "clubs"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("Mail-In Rebate (#1029)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("mail-in-rebate");
  });

  test("pays $5 per discarded card of the chosen rank", () => {
    const result = applyOnDiscardJokers(
      [createMailInRebateJoker()],
      [card("9"), card("9")],
      { rebateRank: "9" },
    );
    expect(result.moneyEarned).toBe(2 * MAIL_IN_REBATE_PAYOUT);
  });

  test("off-rank discards pay nothing (negative)", () => {
    const result = applyOnDiscardJokers(
      [createMailInRebateJoker()],
      [card("4")],
      { rebateRank: "9" },
    );
    expect(result.moneyEarned).toBe(0);
  });

  test("no chosen rank pays nothing (negative)", () => {
    const result = applyOnDiscardJokers(
      [createMailInRebateJoker()],
      [card("9")],
      { rebateRank: null },
    );
    expect(result.moneyEarned).toBe(0);
  });
});
