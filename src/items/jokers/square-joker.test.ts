// @vitest-environment node
import {
  applyHandLevelJokers,
  applyHandPlayedToJokerStates,
  createJokerCatalog,
  createSquareJokerJoker,
  SQUARE_JOKER_CARD_COUNT,
  SQUARE_JOKER_CHIPS_PER_FOUR_CARD,
} from "../jokers";

function ctx(playedCardCount: number) {
  return {
    playedHandLabel: "High Card" as const,
    playedCardCount,
    scoredCards: [],
  };
}

describe("Square Joker (#825)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("square-joker");
  });

  test("starts with state.value 0", () => {
    expect(createSquareJokerJoker().state).toEqual({
      kind: "counter",
      value: 0,
    });
  });

  test("contributes 0 chips on the first hand (state still 0)", () => {
    const result = applyHandLevelJokers([createSquareJokerJoker()], ctx(4));
    expect(result.additiveChips).toBe(0);
  });

  test("bumps state by SQUARE_JOKER_CHIPS_PER_FOUR_CARD when exactly 4 cards are played", () => {
    const [updated] = applyHandPlayedToJokerStates(
      [createSquareJokerJoker()],
      ctx(SQUARE_JOKER_CARD_COUNT),
    );
    expect(updated.state).toEqual({
      kind: "counter",
      value: SQUARE_JOKER_CHIPS_PER_FOUR_CARD,
    });
  });

  test("the accumulated state is applied as additive chips on the next scoring", () => {
    const joker = {
      ...createSquareJokerJoker(),
      state: { kind: "counter" as const, value: 12 },
    };
    const result = applyHandLevelJokers([joker], { playedHandLabel: "Pair" });
    expect(result.additiveChips).toBe(12);
  });

  test("a 3-card hand does not increment state (negative)", () => {
    const [updated] = applyHandPlayedToJokerStates(
      [createSquareJokerJoker()],
      ctx(3),
    );
    expect(updated.state).toEqual({ kind: "counter", value: 0 });
  });

  test("a 5-card hand does not increment state (negative)", () => {
    const [updated] = applyHandPlayedToJokerStates(
      [createSquareJokerJoker()],
      ctx(5),
    );
    expect(updated.state).toEqual({ kind: "counter", value: 0 });
  });

  test("stacks across multiple 4-card hands", () => {
    let jokers = [createSquareJokerJoker()];
    for (let i = 0; i < 4; i += 1) {
      jokers = applyHandPlayedToJokerStates(jokers, ctx(SQUARE_JOKER_CARD_COUNT));
    }
    expect(jokers[0].state).toEqual({
      kind: "counter",
      value: SQUARE_JOKER_CHIPS_PER_FOUR_CARD * 4,
    });
  });
});
