import { describe, expect, test } from "vitest";
import { ADVISOR_MODEL_URL, sharedAdvisorRanker } from "./advisorRanker";

describe("sharedAdvisorRanker", () => {
  test("points at the committed model asset", () => {
    expect(ADVISOR_MODEL_URL).toBe("/models/advisor-policy-v7.onnx");
  });

  test("exposes a ranker with load and rank", () => {
    const ranker = sharedAdvisorRanker();
    expect(typeof ranker.load === "function" && typeof ranker.rank).toBe(
      "function",
    );
  });

  test("memoizes the shared ranker across calls", () => {
    expect(sharedAdvisorRanker()).toBe(sharedAdvisorRanker());
  });
});
