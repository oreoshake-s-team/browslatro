// @vitest-environment node
import {
  BOOTSTRAPS_BUCKET_DOLLARS,
  BOOTSTRAPS_MULT_PER_BUCKET,
  applyHandLevelJokers,
  applyPerCardJokers,
  createBootstrapsJoker,
} from "../jokers";
import type { JokerRarity } from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("Bootstraps", () => {
  test("adds BOOTSTRAPS_MULT_PER_BUCKET for one whole $BOOTSTRAPS_BUCKET_DOLLARS bucket", () => {
    const result = applyHandLevelJokers([createBootstrapsJoker()], {
      money: BOOTSTRAPS_BUCKET_DOLLARS,
    });
    expect(result.additiveMult).toBe(BOOTSTRAPS_MULT_PER_BUCKET);
  });

  test("scales mult with the number of whole buckets", () => {
    const result = applyHandLevelJokers([createBootstrapsJoker()], {
      money: BOOTSTRAPS_BUCKET_DOLLARS * 4,
    });
    expect(result.additiveMult).toBe(BOOTSTRAPS_MULT_PER_BUCKET * 4);
  });

  test("rounds down partial buckets", () => {
    const partial = BOOTSTRAPS_BUCKET_DOLLARS * 2 + (BOOTSTRAPS_BUCKET_DOLLARS - 1);
    const result = applyHandLevelJokers([createBootstrapsJoker()], {
      money: partial,
    });
    expect(result.additiveMult).toBe(BOOTSTRAPS_MULT_PER_BUCKET * 2);
  });

  test("contributes no mult when money is below one bucket", () => {
    const result = applyHandLevelJokers([createBootstrapsJoker()], {
      money: BOOTSTRAPS_BUCKET_DOLLARS - 1,
    });
    expect(result.additiveMult).toBe(0);
  });

  test("does not fire when money is below one bucket", () => {
    const result = applyHandLevelJokers([createBootstrapsJoker()], {
      money: BOOTSTRAPS_BUCKET_DOLLARS - 1,
    });
    expect(result.firedJokerIds).toEqual([]);
  });

  test("clamps to zero buckets when the player is in debt", () => {
    const result = applyHandLevelJokers([createBootstrapsJoker()], { money: -20 });
    expect(result.additiveMult).toBe(0);
  });

  test("contributes no mult when money is missing from context", () => {
    const result = applyHandLevelJokers([createBootstrapsJoker()], {});
    expect(result.additiveMult).toBe(0);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers([createBootstrapsJoker()], card("K"));
    expect(result.firedJokerIds).toEqual([]);
  });

  test("is an uncommon joker", () => {
    expect(createBootstrapsJoker().rarity).toBe<JokerRarity>("uncommon");
  });
});
