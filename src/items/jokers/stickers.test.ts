// @vitest-environment node
import {
  JOKER_STICKER_INFO,
  PERISHABLE_LIFE,
  RENTAL_BASE_PRICE,
  applyStakeStickersOnRoll,
  canDestroyJoker,
  canSellJoker,
  createBusinessCardJoker,
  hasSticker,
  isJokerActive,
  jokerStickers,
  tickPerishableRounds,
  type Joker,
} from "../jokers";

function withStickers(joker: Joker, stickers: Joker["stickers"]): Joker {
  return { ...joker, stickers };
}

describe("jokerStickers", () => {
  test("returns an empty array when stickers is undefined", () => {
    expect(jokerStickers(createBusinessCardJoker())).toEqual([]);
  });

  test("returns the joker's sticker array when present", () => {
    const j = withStickers(createBusinessCardJoker(), [{ kind: "eternal" }]);
    expect(jokerStickers(j)).toEqual([{ kind: "eternal" }]);
  });
});

describe("hasSticker", () => {
  test("returns false for a sticker that isn't attached", () => {
    expect(hasSticker(createBusinessCardJoker(), "eternal")).toBe(false);
  });

  test("returns true when the sticker is attached", () => {
    const j = withStickers(createBusinessCardJoker(), [{ kind: "rental" }]);
    expect(hasSticker(j, "rental")).toBe(true);
  });
});

describe("canSellJoker / canDestroyJoker", () => {
  test("plain joker can be sold", () => {
    expect(canSellJoker(createBusinessCardJoker())).toBe(true);
  });

  test("eternal joker cannot be sold", () => {
    const j = withStickers(createBusinessCardJoker(), [{ kind: "eternal" }]);
    expect(canSellJoker(j)).toBe(false);
  });

  test("plain joker can be destroyed", () => {
    expect(canDestroyJoker(createBusinessCardJoker())).toBe(true);
  });

  test("eternal joker cannot be destroyed", () => {
    const j = withStickers(createBusinessCardJoker(), [{ kind: "eternal" }]);
    expect(canDestroyJoker(j)).toBe(false);
  });

  test("rental joker can still be sold", () => {
    const j = withStickers(createBusinessCardJoker(), [{ kind: "rental" }]);
    expect(canSellJoker(j)).toBe(true);
  });
});

describe("isJokerActive", () => {
  test("plain joker is active", () => {
    expect(isJokerActive(createBusinessCardJoker())).toBe(true);
  });

  test("perishable joker is active before its life expires", () => {
    const j = withStickers(createBusinessCardJoker(), [
      { kind: "perishable", roundsHeld: PERISHABLE_LIFE - 1 },
    ]);
    expect(isJokerActive(j)).toBe(true);
  });

  test("perishable joker is inactive at its life threshold", () => {
    const j = withStickers(createBusinessCardJoker(), [
      { kind: "perishable", roundsHeld: PERISHABLE_LIFE },
    ]);
    expect(isJokerActive(j)).toBe(false);
  });

  test("perishable joker is inactive past its life threshold", () => {
    const j = withStickers(createBusinessCardJoker(), [
      { kind: "perishable", roundsHeld: PERISHABLE_LIFE + 3 },
    ]);
    expect(isJokerActive(j)).toBe(false);
  });

  test("eternal joker remains active regardless of perishable", () => {
    const j = withStickers(createBusinessCardJoker(), [{ kind: "eternal" }]);
    expect(isJokerActive(j)).toBe(true);
  });
});

describe("applyStakeStickersOnRoll", () => {
  function fixedRng(values: ReadonlyArray<number>): () => number {
    let i = 0;
    return () => {
      const v = values[i % values.length];
      i += 1;
      return v;
    };
  }

  test("returns the joker unchanged when odds is undefined", () => {
    const joker = createBusinessCardJoker();
    expect(applyStakeStickersOnRoll(joker, undefined, fixedRng([0])))
      .toBe(joker);
  });

  test("applies eternal when the eternal roll falls under its probability", () => {
    const joker = createBusinessCardJoker();
    const result = applyStakeStickersOnRoll(
      joker,
      { eternal: 1 },
      fixedRng([0]),
    );
    expect(hasSticker(result, "eternal")).toBe(true);
  });

  test("does not apply eternal when the roll is at the probability (negative)", () => {
    const joker = createBusinessCardJoker();
    const result = applyStakeStickersOnRoll(
      joker,
      { eternal: 0.3 },
      fixedRng([0.5]),
    );
    expect(hasSticker(result, "eternal")).toBe(false);
  });

  test("applies multiple stickers when all rolls succeed", () => {
    const joker = createBusinessCardJoker();
    const result = applyStakeStickersOnRoll(
      joker,
      { eternal: 1, perishable: 1, rental: 1 },
      fixedRng([0]),
    );
    expect(jokerStickers(result).map((s) => s.kind).sort()).toEqual([
      "eternal",
      "perishable",
      "rental",
    ]);
  });

  test("perishable sticker starts with roundsHeld = 0", () => {
    const joker = createBusinessCardJoker();
    const result = applyStakeStickersOnRoll(
      joker,
      { perishable: 1 },
      fixedRng([0]),
    );
    const perishable = jokerStickers(result).find((s) => s.kind === "perishable");
    expect(perishable).toEqual({ kind: "perishable", roundsHeld: 0 });
  });
});

describe("tickPerishableRounds", () => {
  test("increments roundsHeld on every perishable sticker", () => {
    const j = withStickers(createBusinessCardJoker(), [
      { kind: "perishable", roundsHeld: 2 },
    ]);
    const [next] = tickPerishableRounds([j]);
    const perishable = jokerStickers(next).find((s) => s.kind === "perishable");
    expect(perishable).toEqual({ kind: "perishable", roundsHeld: 3 });
  });

  test("leaves non-perishable stickers untouched", () => {
    const j = withStickers(createBusinessCardJoker(), [
      { kind: "eternal" },
      { kind: "perishable", roundsHeld: 0 },
    ]);
    const [next] = tickPerishableRounds([j]);
    expect(jokerStickers(next)[0]).toEqual({ kind: "eternal" });
  });

  test("is a no-op for jokers with no stickers", () => {
    const j = createBusinessCardJoker();
    const [next] = tickPerishableRounds([j]);
    expect(next).toBe(j);
  });
});

describe("JOKER_STICKER_INFO", () => {
  test("rental description mentions the rental base price", () => {
    expect(JOKER_STICKER_INFO.rental.description).toMatch(
      new RegExp(`\\$${RENTAL_BASE_PRICE}\\b`),
    );
  });

  test("perishable description mentions the perishable life threshold", () => {
    expect(JOKER_STICKER_INFO.perishable.description).toMatch(
      new RegExp(`${PERISHABLE_LIFE}\\b`),
    );
  });

  test("eternal description names the lifecycle restriction", () => {
    expect(JOKER_STICKER_INFO.eternal.description).toMatch(/sold|destroyed/);
  });
});
