import { describe, expect, test, vi } from "vitest";
import type { ShopAdviceCandidate } from "../src/ai/advisor/types";
import { seededRng, type ShopView } from "../src/ai/headlessRun";
import { createDefaultHandStats } from "../src/scoring/handStats";
import { argmax, isContested, labelShopWithGate } from "./shopTeacherGate";

function shopViewFixture(): ShopView {
  return {
    ante: 2,
    round: 5,
    money: 10,
    jokers: [],
    handStats: createDefaultHandStats(),
    deck: [],
    ownedVoucherIds: new Set(),
    lastConsumable: null,
    rng: seededRng(0),
  };
}

const CANDIDATES: ReadonlyArray<ShopAdviceCandidate> = [
  { action: "buy", item: { itemType: "joker", id: "a", name: "A", description: "", cost: 4 } },
  { action: "buy", item: { itemType: "joker", id: "b", name: "B", description: "", cost: 5 } },
  { action: "leave" },
];

describe("argmax", () => {
  test("returns the index of the highest score", () => {
    expect(argmax([1, 9, 3])).toBe(1);
  });
});

describe("isContested", () => {
  test("equal top-two scores are contested", () => {
    expect(isContested([5, 5, 1], 0.1)).toBe(true);
  });

  test("a dominant top score is not contested", () => {
    expect(isContested([10, 3, 1], 0.1)).toBe(false);
  });

  test("fewer than two scores is never contested", () => {
    expect(isContested([5], 0.5)).toBe(false);
  });
});

describe("labelShopWithGate", () => {
  test("confident shop uses the rollout argmax and never calls the teacher", async () => {
    const teacher = vi.fn();
    const result = await labelShopWithGate({
      scores: [10, 3, 1],
      view: shopViewFixture(),
      candidates: CANDIDATES,
      teacher,
      margin: 0.1,
    });
    expect(result).toEqual({ index: 0, source: "rollout" });
  });

  test("confident shop does not invoke the teacher", async () => {
    const teacher = vi.fn();
    await labelShopWithGate({
      scores: [10, 3, 1],
      view: shopViewFixture(),
      candidates: CANDIDATES,
      teacher,
      margin: 0.1,
    });
    expect(teacher).not.toHaveBeenCalled();
  });

  test("contested shop uses the teacher's index", async () => {
    const teacher = vi.fn().mockResolvedValue(1);
    const result = await labelShopWithGate({
      scores: [5, 5, 1],
      view: shopViewFixture(),
      candidates: CANDIDATES,
      teacher,
      margin: 0.1,
    });
    expect(result).toEqual({ index: 1, source: "teacher" });
  });

  test("contested shop falls back to rollout when the teacher returns null", async () => {
    const teacher = vi.fn().mockResolvedValue(null);
    const result = await labelShopWithGate({
      scores: [5, 5, 1],
      view: shopViewFixture(),
      candidates: CANDIDATES,
      teacher,
      margin: 0.1,
    });
    expect(result).toEqual({ index: 0, source: "rollout" });
  });
});
