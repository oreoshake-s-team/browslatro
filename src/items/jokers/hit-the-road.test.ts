// @vitest-environment node
import {
  HIT_THE_ROAD_X_MULT_PER_JACK,
  applyDiscardToJokerStates,
  applyHandLevelJokers,
  applyRoundEndToJokerStates,
  createHitTheRoadJoker,
  createJokerCatalog,
} from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("Hit the Road (#885)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("hit-the-road");
  });

  test("discarding one Jack gives X1.5 Mult", () => {
    const jokers = applyDiscardToJokerStates([createHitTheRoadJoker()], [
      card("J"),
    ]);
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "Pair" });
    expect(result.xMult).toBe(1 + HIT_THE_ROAD_X_MULT_PER_JACK);
  });

  test("discarding two Jacks at once gives X2 Mult", () => {
    const jokers = applyDiscardToJokerStates([createHitTheRoadJoker()], [
      card("J"),
      card("J"),
    ]);
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "Pair" });
    expect(result.xMult).toBe(1 + 2 * HIT_THE_ROAD_X_MULT_PER_JACK);
  });

  test("non-Jack discards do not grow the counter (negative)", () => {
    const jokers = applyDiscardToJokerStates([createHitTheRoadJoker()], [
      card("A"),
      card("K"),
    ]);
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "Pair" });
    expect(result.xMult).toBe(1);
  });

  test("the counter resets at the end of the round", () => {
    const grown = applyDiscardToJokerStates([createHitTheRoadJoker()], [
      card("J"),
    ]);
    const [reset] = applyRoundEndToJokerStates(grown, () => 0.99);
    expect(reset.state).toEqual({ kind: "counter", value: 0 });
  });

  test("contributes nothing before any Jack is discarded (negative)", () => {
    const result = applyHandLevelJokers([createHitTheRoadJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.xMult).toBe(1);
  });
});
