// @vitest-environment node
import {
  ICE_CREAM_CHIPS,
  LOYALTY_CARD_HANDS_PER_TRIGGER,
  LOYALTY_CARD_X_MULT,
  POPCORN_MULT,
  EROSION_MULT_PER_MISSING_CARD,
  CAMPFIRE_X_MULT_PER_SOLD_CARD,
  CONSTELLATION_X_MULT_PER_PLANET,
  FORTUNE_TELLER_MULT_PER_TAROT,
  HIT_THE_ROAD_X_MULT_PER_JACK,
  JOKER_SELL_VALUE,
  LUCKY_CAT_X_MULT_PER_TRIGGER,
  OBELISK_X_MULT_PER_CONSECUTIVE_HAND,
  applyDiscardToJokerStates,
  createCampfireJoker,
  createConstellationJoker,
  createEggJoker,
  createErosionJoker,
  createFlashCardJoker,
  createFortuneTellerJoker,
  createHitTheRoadJoker,
  createHologramJoker,
  createIceCreamJoker,
  createJokerCatalog,
  createLoyaltyCardJoker,
  createLuckyCatJoker,
  createObeliskJoker,
  createPareidoliaJoker,
  createPopcornJoker,
  createRamenJoker,
  createRedCardJoker,
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
    const [ramen] = applyDiscardToJokerStates(
      [createRamenJoker()],
      [
        { id: 1, rank: "7", suit: "clubs" },
        { id: 2, rank: "7", suit: "clubs" },
        { id: 3, rank: "7", suit: "clubs" },
      ],
    );
    expect(jokerCurrentValue(ramen, CTX)).toEqual({
      kind: "x-mult",
      value: 1.97,
    });
  });

  test("Red Card reports its accumulated Mult from skipped packs", () => {
    expect(
      jokerCurrentValue(withCounter(createRedCardJoker(), 6), CTX),
    ).toEqual({ kind: "mult", value: 6 });
  });

  test("Fortune Teller reports its accumulated Mult from Tarots used", () => {
    expect(
      jokerCurrentValue(withCounter(createFortuneTellerJoker(), 5), CTX),
    ).toEqual({ kind: "mult", value: FORTUNE_TELLER_MULT_PER_TAROT * 5 });
  });

  test("Hit the Road derives X Mult from Jacks discarded this round", () => {
    expect(
      jokerCurrentValue(withCounter(createHitTheRoadJoker(), 2), CTX),
    ).toEqual({ kind: "x-mult", value: 1 + HIT_THE_ROAD_X_MULT_PER_JACK * 2 });
  });

  test("Lucky Cat derives X Mult from Lucky card triggers", () => {
    expect(
      jokerCurrentValue(withCounter(createLuckyCatJoker(), 4), CTX),
    ).toEqual({ kind: "x-mult", value: 1 + LUCKY_CAT_X_MULT_PER_TRIGGER * 4 });
  });

  test("Constellation derives X Mult from Planets used", () => {
    expect(
      jokerCurrentValue(withCounter(createConstellationJoker(), 3), CTX),
    ).toEqual({
      kind: "x-mult",
      value: 1 + CONSTELLATION_X_MULT_PER_PLANET * 3,
    });
  });

  test("Campfire derives X Mult from cards sold", () => {
    expect(
      jokerCurrentValue(withCounter(createCampfireJoker(), 2), CTX),
    ).toEqual({ kind: "x-mult", value: 1 + CAMPFIRE_X_MULT_PER_SOLD_CARD * 2 });
  });

  test("Obelisk derives X Mult from consecutive hands without the most played hand", () => {
    expect(
      jokerCurrentValue(withCounter(createObeliskJoker(), 4), CTX),
    ).toEqual({
      kind: "x-mult",
      value: 1 + OBELISK_X_MULT_PER_CONSECUTIVE_HAND * 4,
    });
  });

  test("a fresh Obelisk reports the X1 baseline", () => {
    expect(jokerCurrentValue(createObeliskJoker(), CTX)).toEqual({
      kind: "x-mult",
      value: 1,
    });
  });

  test("Egg reports its grown total sell value", () => {
    expect(jokerCurrentValue(withCounter(createEggJoker(), 9), CTX)).toEqual({
      kind: "sell-value",
      value: JOKER_SELL_VALUE + 9,
    });
  });

  test("a fresh Egg reports the base sell value", () => {
    expect(jokerCurrentValue(createEggJoker(), CTX)).toEqual({
      kind: "sell-value",
      value: JOKER_SELL_VALUE,
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

  test("formats a sell value", () => {
    expect(jokerCurrentValueLabel({ kind: "sell-value", value: 12 })).toBe(
      "Currently: $12 sell value",
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
