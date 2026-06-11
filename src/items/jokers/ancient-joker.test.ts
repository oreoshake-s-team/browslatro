// @vitest-environment node
import {
  ANCIENT_JOKER_X_MULT,
  applyPerCardJokers,
  createAncientJoker,
  createJokerCatalog,
} from "../jokers";
import type { Card } from "../../cards/types";

const kingOfHearts: Card = { id: 1, rank: "K", suit: "hearts" };

describe("Ancient Joker", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("ancient-joker");
  });

  test("a card of the chosen suit scores X1.5 Mult", () => {
    const result = applyPerCardJokers(
      [createAncientJoker()],
      kingOfHearts,
      () => 0.5,
      { ancientSuit: "hearts" },
    );
    expect(result.xMult).toBe(ANCIENT_JOKER_X_MULT);
  });

  test("an off-suit card does not fire (negative)", () => {
    const result = applyPerCardJokers(
      [createAncientJoker()],
      kingOfHearts,
      () => 0.5,
      { ancientSuit: "clubs" },
    );
    expect(result.xMult).toBe(1);
  });

  test("does not fire without a chosen suit (negative)", () => {
    const result = applyPerCardJokers(
      [createAncientJoker()],
      kingOfHearts,
      () => 0.5,
      { ancientSuit: null },
    );
    expect(result.xMult).toBe(1);
  });

  test("smeared suits merge diamonds into a hearts target", () => {
    const kingOfDiamonds: Card = { id: 2, rank: "K", suit: "diamonds" };
    const result = applyPerCardJokers(
      [createAncientJoker()],
      kingOfDiamonds,
      () => 0.5,
      { ancientSuit: "hearts", smearedSuits: true },
    );
    expect(result.xMult).toBe(ANCIENT_JOKER_X_MULT);
  });
});
