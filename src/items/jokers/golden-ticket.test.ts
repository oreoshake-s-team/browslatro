// @vitest-environment node
import {
  GOLDEN_TICKET_PAYOUT,
  applyPerCardJokers,
  createGoldenTicketJoker,
  createJokerCatalog,
} from "../jokers";
import type { Card } from "../../cards/types";

const goldCard: Card = { id: 1, rank: "K", suit: "spades", enhancement: "gold" };
const plainCard: Card = { id: 2, rank: "K", suit: "spades" };

describe("Golden Ticket", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("golden-ticket");
  });

  test("a scored Gold card earns the payout", () => {
    const result = applyPerCardJokers([createGoldenTicketJoker()], goldCard);
    expect(result.moneyEarned).toBe(GOLDEN_TICKET_PAYOUT);
  });

  test("a non-gold card earns nothing (negative)", () => {
    const result = applyPerCardJokers([createGoldenTicketJoker()], plainCard);
    expect(result.moneyEarned).toBe(0);
  });

  test("a gold card earns nothing without Golden Ticket (negative)", () => {
    const result = applyPerCardJokers(
      createJokerCatalog().slice(0, 1),
      goldCard,
    );
    expect(result.moneyEarned).toBe(0);
  });
});
