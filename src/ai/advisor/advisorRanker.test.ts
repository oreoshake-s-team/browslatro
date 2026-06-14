import { describe, expect, test, vi } from "vitest";
import {
  ADVISOR_MODEL_URL,
  reportAdvisorFallback,
  sharedAdvisorRanker,
} from "./advisorRanker";

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

  test("reportAdvisorFallback warns that it is degrading to greedy suggestions", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    reportAdvisorFallback(new Error("model 404"));
    expect(warn.mock.calls[0]?.[0]).toMatch(/greedy/i);
    warn.mockRestore();
  });
});
