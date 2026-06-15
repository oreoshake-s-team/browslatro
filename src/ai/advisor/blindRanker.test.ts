import { describe, expect, test } from "vitest";
import { BLIND_MODEL_URL, sharedBlindRanker } from "./blindRanker";

describe("sharedBlindRanker", () => {
  test("points at the committed model asset", () => {
    expect(BLIND_MODEL_URL).toBe("/models/advisor-blind-policy-v1.onnx");
  });

  test("exposes a ranker with load and rankBlind", () => {
    const ranker = sharedBlindRanker();
    expect(
      typeof ranker.load === "function" &&
        typeof ranker.rankBlind === "function",
    ).toBe(true);
  });

  test("memoizes the shared ranker across calls", () => {
    expect(sharedBlindRanker()).toBe(sharedBlindRanker());
  });
});
