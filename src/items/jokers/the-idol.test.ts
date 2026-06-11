// @vitest-environment node
import {
  THE_IDOL_X_MULT,
  applyPerCardJokers,
  createJokerCatalog,
  createTheIdolJoker,
} from "../jokers";
import type { Card } from "../../cards/types";

const aceOfSpades: Card = { id: 1, rank: "A", suit: "spades" };

describe("The Idol", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("the-idol");
  });

  test("the chosen card scores X2 Mult", () => {
    const result = applyPerCardJokers(
      [createTheIdolJoker()],
      aceOfSpades,
      () => 0.5,
      { idolTarget: { rank: "A", suit: "spades" } },
    );
    expect(result.xMult).toBe(THE_IDOL_X_MULT);
  });

  test("a matching rank of the wrong suit does not fire (negative)", () => {
    const result = applyPerCardJokers(
      [createTheIdolJoker()],
      aceOfSpades,
      () => 0.5,
      { idolTarget: { rank: "A", suit: "hearts" } },
    );
    expect(result.xMult).toBe(1);
  });

  test("a matching suit of the wrong rank does not fire (negative)", () => {
    const result = applyPerCardJokers(
      [createTheIdolJoker()],
      aceOfSpades,
      () => 0.5,
      { idolTarget: { rank: "K", suit: "spades" } },
    );
    expect(result.xMult).toBe(1);
  });

  test("does not fire without a chosen card (negative)", () => {
    const result = applyPerCardJokers(
      [createTheIdolJoker()],
      aceOfSpades,
      () => 0.5,
      { idolTarget: null },
    );
    expect(result.xMult).toBe(1);
  });

  test("smeared suits merge the target suit", () => {
    const aceOfClubs: Card = { id: 2, rank: "A", suit: "clubs" };
    const result = applyPerCardJokers(
      [createTheIdolJoker()],
      aceOfClubs,
      () => 0.5,
      { idolTarget: { rank: "A", suit: "spades" }, smearedSuits: true },
    );
    expect(result.xMult).toBe(THE_IDOL_X_MULT);
  });
});
