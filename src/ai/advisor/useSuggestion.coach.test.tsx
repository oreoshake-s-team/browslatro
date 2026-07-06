import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { ShopAdviceRequest } from "./types";
import { useSuggestion, type SuggestionPlan } from "./useSuggestion";

function plan(): SuggestionPlan<string> {
  const request: ShopAdviceRequest = {
    context: "shop",
    shop: {
      money: 4,
      ante: 1,
      jokers: [],
      jokerCapacity: 5,
      consumables: [],
      consumableCapacity: 2,
      ownedVoucherIds: [],
    },
    candidates: [{ action: "reroll", cost: 5 }, { action: "leave" }],
  };
  return { request, actions: ["reroll", "leave"] };
}

describe("useSuggestion — coach pre-rank failures", () => {
  test("marks the coach unavailable when the pre-ranker rejects", async () => {
    const { result } = renderHook(() =>
      useSuggestion(plan, undefined, () =>
        Promise.reject(new Error("model failed")),
      ),
    );
    await act(() => result.current.coach());
    expect(result.current.state).toMatchObject({
      phase: "coach",
      onnxIndex: null,
      coachUnavailable: true,
    });
  });

  test("a successful pre-rank does not mark the coach unavailable", async () => {
    const { result } = renderHook(() =>
      useSuggestion(plan, undefined, () => Promise.resolve(1)),
    );
    await act(() => result.current.coach());
    expect(result.current.state).toMatchObject({
      phase: "coach",
      onnxIndex: 1,
      coachUnavailable: false,
    });
  });
});
