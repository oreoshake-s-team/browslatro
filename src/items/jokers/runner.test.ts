// @vitest-environment node
import {
  applyHandLevelJokers,
  applyHandPlayedToJokerStates,
  createJokerCatalog,
  createRunnerJoker,
  RUNNER_CHIPS_PER_STRAIGHT,
} from "../jokers";

const STRAIGHT_CTX = {
  playedHandLabel: "Straight" as const,
  playedCardCount: 5,
  scoredCards: [],
};

describe("Runner joker (#825)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("runner");
  });

  test("starts with state.value 0", () => {
    expect(createRunnerJoker().state).toEqual({ kind: "counter", value: 0 });
  });

  test("contributes 0 chips on the first hand (state still 0)", () => {
    const result = applyHandLevelJokers([createRunnerJoker()], STRAIGHT_CTX);
    expect(result.additiveChips).toBe(0);
  });

  test("applyHandPlayedToJokerStates bumps state by RUNNER_CHIPS_PER_STRAIGHT after a Straight", () => {
    const [updated] = applyHandPlayedToJokerStates(
      [createRunnerJoker()],
      STRAIGHT_CTX,
    );
    expect(updated.state).toEqual({
      kind: "counter",
      value: RUNNER_CHIPS_PER_STRAIGHT,
    });
  });

  test("the accumulated state is applied as additive chips on the next scoring", () => {
    const joker = {
      ...createRunnerJoker(),
      state: { kind: "counter" as const, value: 30 },
    };
    const result = applyHandLevelJokers([joker], {
      playedHandLabel: "High Card",
    });
    expect(result.additiveChips).toBe(30);
  });

  test("stacks across multiple Straights", () => {
    let jokers = [createRunnerJoker()];
    jokers = applyHandPlayedToJokerStates(jokers, STRAIGHT_CTX);
    jokers = applyHandPlayedToJokerStates(jokers, STRAIGHT_CTX);
    jokers = applyHandPlayedToJokerStates(jokers, STRAIGHT_CTX);
    expect(jokers[0].state).toEqual({
      kind: "counter",
      value: RUNNER_CHIPS_PER_STRAIGHT * 3,
    });
  });

  test("non-Straight hands do not increment state (negative)", () => {
    let jokers = [createRunnerJoker()];
    jokers = applyHandPlayedToJokerStates(jokers, {
      playedHandLabel: "Two Pair",
      playedCardCount: 4,
      scoredCards: [],
    });
    jokers = applyHandPlayedToJokerStates(jokers, {
      playedHandLabel: "Flush",
      playedCardCount: 5,
      scoredCards: [],
    });
    expect(jokers[0].state).toEqual({ kind: "counter", value: 0 });
  });

  test("Straight Flush (which contains Straight) increments state", () => {
    const [updated] = applyHandPlayedToJokerStates([createRunnerJoker()], {
      playedHandLabel: "Straight Flush",
      playedCardCount: 5,
      scoredCards: [],
    });
    expect(updated.state).toEqual({
      kind: "counter",
      value: RUNNER_CHIPS_PER_STRAIGHT,
    });
  });
});
