// @vitest-environment node
import {
  ICE_CREAM_CHIPS,
  LOYALTY_CARD_HANDS_PER_TRIGGER,
  LOYALTY_CARD_X_MULT,
  POPCORN_MULT,
  EROSION_MULT_PER_MISSING_CARD,
  applyDiscardToJokerStates,
  createErosionJoker,
  createFlashCardJoker,
  createHologramJoker,
  createIceCreamJoker,
  createJokerCatalog,
  createLoyaltyCardJoker,
  createPareidoliaJoker,
  createPopcornJoker,
  createRamenJoker,
  createRunnerJoker,
  createThrowbackJoker,
  jokerCurrentValue,
  jokerCurrentValueLabel,
  type Joker,
  type JokerCurrentValueContext,
} from "../jokers";

const CTX: JokerCurrentValueContext = {
  blindsSkipped: 0,
  addedCardsCount: 0,
  missingDeckCards: 0,
};

function withCounter(joker: Joker, value: number): Joker {
  return { ...joker, state: { kind: "counter", value } };
}

describe("jokerCurrentValue (#884)", () => {
  test("every catalog joker with counter state reports a current value", () => {
    const missing = createJokerCatalog()
      .filter((j) => j.state?.kind === "counter")
      .filter((j) => jokerCurrentValue(j, CTX) === null)
      .map((j) => j.id);
    expect(missing).toEqual([]);
  });

  test("a joker without scaling state reports null", () => {
    expect(jokerCurrentValue(createPareidoliaJoker(), CTX)).toBeNull();
  });

  test("a counter Mult stacker reports its accumulated Mult", () => {
    expect(
      jokerCurrentValue(withCounter(createFlashCardJoker(), 14), CTX),
    ).toEqual({ kind: "mult", value: 14 });
  });

  test("a fresh counter Mult stacker reports zero", () => {
    expect(jokerCurrentValue(createFlashCardJoker(), CTX)).toEqual({
      kind: "mult",
      value: 0,
    });
  });

  test("a counter Chips stacker reports its accumulated Chips", () => {
    expect(jokerCurrentValue(withCounter(createRunnerJoker(), 30), CTX)).toEqual(
      { kind: "chips", value: 30 },
    );
  });

  test("Ice Cream reports its remaining Chips", () => {
    expect(jokerCurrentValue(createIceCreamJoker(), CTX)).toEqual({
      kind: "chips",
      value: ICE_CREAM_CHIPS,
    });
  });

  test("Popcorn reports its remaining Mult", () => {
    expect(jokerCurrentValue(createPopcornJoker(), CTX)).toEqual({
      kind: "mult",
      value: POPCORN_MULT,
    });
  });

  test("a fresh Loyalty Card reports the full hands-until-trigger window", () => {
    expect(jokerCurrentValue(createLoyaltyCardJoker(), CTX)).toEqual({
      kind: "hands-until-x-mult",
      hands: LOYALTY_CARD_HANDS_PER_TRIGGER,
      xmult: LOYALTY_CARD_X_MULT,
    });
  });

  test("Loyalty Card one hand before the trigger reports 1 hand remaining", () => {
    expect(
      jokerCurrentValue(
        withCounter(
          createLoyaltyCardJoker(),
          LOYALTY_CARD_HANDS_PER_TRIGGER - 1,
        ),
        CTX,
      ),
    ).toEqual({
      kind: "hands-until-x-mult",
      hands: 1,
      xmult: LOYALTY_CARD_X_MULT,
    });
  });

  test("Throwback derives X Mult from blinds skipped", () => {
    expect(
      jokerCurrentValue(createThrowbackJoker(), {
        ...CTX,
        blindsSkipped: 2,
      }),
    ).toEqual({ kind: "x-mult", value: 1.5 });
  });

  test("Hologram derives X Mult from added cards", () => {
    expect(
      jokerCurrentValue(createHologramJoker(), {
        ...CTX,
        addedCardsCount: 3,
      }),
    ).toEqual({ kind: "x-mult", value: 1.75 });
  });

  test("Erosion derives Mult from cards missing below the base deck size", () => {
    expect(
      jokerCurrentValue(createErosionJoker(), { ...CTX, missingDeckCards: 3 }),
    ).toEqual({ kind: "mult", value: EROSION_MULT_PER_MISSING_CARD * 3 });
  });

  test("Erosion with a full deck reports zero Mult", () => {
    expect(jokerCurrentValue(createErosionJoker(), CTX)).toEqual({
      kind: "mult",
      value: 0,
    });
  });

  test("Ramen reports its shrunken X Mult after discards", () => {
    const [ramen] = applyDiscardToJokerStates([createRamenJoker()], 3);
    expect(jokerCurrentValue(ramen, CTX)).toEqual({
      kind: "x-mult",
      value: 1.97,
    });
  });
});

describe("jokerCurrentValueLabel (#884)", () => {
  test("formats accumulated Mult", () => {
    expect(jokerCurrentValueLabel({ kind: "mult", value: 14 })).toBe(
      "Currently: +14 Mult",
    );
  });

  test("formats accumulated Chips", () => {
    expect(jokerCurrentValueLabel({ kind: "chips", value: 30 })).toBe(
      "Currently: +30 Chips",
    );
  });

  test("formats an X Mult factor to two decimals", () => {
    expect(jokerCurrentValueLabel({ kind: "x-mult", value: 1.9700000001 })).toBe(
      "Currently: X1.97 Mult",
    );
  });

  test("formats a plural hands-until-trigger countdown", () => {
    expect(
      jokerCurrentValueLabel({ kind: "hands-until-x-mult", hands: 6, xmult: 4 }),
    ).toBe("X4 Mult in 6 hands");
  });

  test("formats a singular hands-until-trigger countdown", () => {
    expect(
      jokerCurrentValueLabel({ kind: "hands-until-x-mult", hands: 1, xmult: 4 }),
    ).toBe("X4 Mult in 1 hand");
  });
});
