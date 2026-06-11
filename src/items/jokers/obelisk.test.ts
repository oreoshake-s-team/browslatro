// @vitest-environment node
import {
  OBELISK_X_MULT_PER_CONSECUTIVE_HAND,
  applyHandLevelJokers,
  applyHandPlayedToJokerStates,
  createJokerCatalog,
  createObeliskJoker,
} from "../jokers";
import { emptyHandCounts } from "../../components/hud/handPlayCounts";

const baseCtx = {
  playedCardCount: 2,
  scoredCards: [],
} as const;

describe("Obelisk", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("obelisk");
  });

  test("playing a hand that is not the most played grows the counter", () => {
    const counts = { ...emptyHandCounts(), Flush: 5, Pair: 1 };
    const [updated] = applyHandPlayedToJokerStates([createObeliskJoker()], {
      ...baseCtx,
      playedHandLabel: "Pair",
      handPlayCounts: counts,
    });
    expect(updated.state).toEqual({ kind: "counter", value: 1 });
  });

  test("playing the most played hand resets the counter", () => {
    const counts = { ...emptyHandCounts(), Flush: 5, Pair: 1 };
    const grown = applyHandPlayedToJokerStates([createObeliskJoker()], {
      ...baseCtx,
      playedHandLabel: "Pair",
      handPlayCounts: counts,
    });
    const [reset] = applyHandPlayedToJokerStates(grown, {
      ...baseCtx,
      playedHandLabel: "Flush",
      handPlayCounts: counts,
    });
    expect(reset.state).toEqual({ kind: "counter", value: 0 });
  });

  test("a hand tied for most played counts as most played and resets (negative)", () => {
    const counts = { ...emptyHandCounts(), Flush: 5, Pair: 5 };
    const [updated] = applyHandPlayedToJokerStates([createObeliskJoker()], {
      ...baseCtx,
      playedHandLabel: "Pair",
      handPlayCounts: counts,
    });
    expect(updated.state).toEqual({ kind: "counter", value: 0 });
  });

  test("two consecutive off-meta hands give X1.4 Mult", () => {
    const counts = { ...emptyHandCounts(), Flush: 5 };
    let jokers = applyHandPlayedToJokerStates([createObeliskJoker()], {
      ...baseCtx,
      playedHandLabel: "Pair",
      handPlayCounts: counts,
    });
    jokers = applyHandPlayedToJokerStates(jokers, {
      ...baseCtx,
      playedHandLabel: "High Card",
      handPlayCounts: counts,
    });
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "Pair" });
    expect(result.xMult).toBe(1 + 2 * OBELISK_X_MULT_PER_CONSECUTIVE_HAND);
  });

  test("contributes nothing with a fresh counter (negative)", () => {
    const result = applyHandLevelJokers([createObeliskJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.xMult).toBe(1);
  });

  test("does not change state when handPlayCounts is not provided (negative)", () => {
    const [updated] = applyHandPlayedToJokerStates([createObeliskJoker()], {
      ...baseCtx,
      playedHandLabel: "Pair",
    });
    expect(updated.state).toEqual({ kind: "counter", value: 0 });
  });
});
