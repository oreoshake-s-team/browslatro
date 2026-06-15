import { describe, expect, test, vi } from "vitest";
import type { ShopAdviceCandidate } from "../src/ai/advisor/types";
import { seededRng, type ShopView } from "../src/ai/headlessRun";
import { createDefaultHandStats } from "../src/scoring/handStats";
import type { Joker } from "../src/items/jokers/types";
import {
  buildShopAdviceRequest,
  createShopTeacher,
  shopStateFromView,
} from "./shopTeacher";

function joker(id: string, name: string): Joker {
  return { id, name } as Joker;
}

function shopViewFixture(overrides: Partial<ShopView> = {}): ShopView {
  return {
    ante: 3,
    round: 7,
    money: 12,
    jokers: [joker("joker", "Joker")],
    handStats: createDefaultHandStats(),
    deck: [],
    ownedVoucherIds: new Set(["overstock"]),
    lastConsumable: null,
    rng: seededRng(0),
    ...overrides,
  };
}

function buyCandidate(id: string, name: string, cost: number): ShopAdviceCandidate {
  return {
    action: "buy",
    item: { itemType: "joker", category: "joker-mult", id, name, description: "", cost },
  };
}

const LEAVE: ShopAdviceCandidate = { action: "leave" };

describe("shopStateFromView", () => {
  test("maps money, ante, jokers, and vouchers from the live view", () => {
    const state = shopStateFromView(shopViewFixture());
    expect(state).toEqual({
      money: 12,
      ante: 3,
      jokers: [{ id: "joker", name: "Joker" }],
      jokerCapacity: 5,
      consumables: [],
      consumableCapacity: 2,
      ownedVoucherIds: ["overstock"],
    });
  });
});

describe("buildShopAdviceRequest", () => {
  test("preserves candidate order so a returned index maps back", () => {
    const candidates = [buyCandidate("a", "A", 4), buyCandidate("b", "B", 6), LEAVE];
    const request = buildShopAdviceRequest(shopViewFixture(), candidates);
    expect(request.candidates).toEqual(candidates);
  });
});

describe("createShopTeacher", () => {
  test("returns the recommendationIndex when the model succeeds", async () => {
    vi.resetModules();
    vi.doMock("../src/ai/advisor/model", () => ({
      requestAdvice: vi.fn().mockResolvedValue({
        ok: true,
        advice: { recommendationIndex: 1, alternativeIndex: 0, whyAlternativeWorse: "", explanation: "", concept: "" },
      }),
    }));
    const teacher = createShopTeacher("sk-test");
    const result = await teacher(shopViewFixture(), [
      buyCandidate("a", "A", 4),
      buyCandidate("b", "B", 6),
      LEAVE,
    ]);
    expect(result).toBe(1);
    vi.doUnmock("../src/ai/advisor/model");
  });

  test("returns null when the model fails", async () => {
    vi.resetModules();
    vi.doMock("../src/ai/advisor/model", () => ({
      requestAdvice: vi.fn().mockResolvedValue({ ok: false, status: 502, code: "model_error" }),
    }));
    const teacher = createShopTeacher("sk-test");
    const result = await teacher(shopViewFixture(), [buyCandidate("a", "A", 4), LEAVE]);
    expect(result).toBeNull();
    vi.doUnmock("../src/ai/advisor/model");
  });

  test("returns null when the model picks an out-of-range index", async () => {
    vi.resetModules();
    vi.doMock("../src/ai/advisor/model", () => ({
      requestAdvice: vi.fn().mockResolvedValue({
        ok: true,
        advice: { recommendationIndex: 5, alternativeIndex: 0, whyAlternativeWorse: "", explanation: "", concept: "" },
      }),
    }));
    const teacher = createShopTeacher("sk-test");
    const result = await teacher(shopViewFixture(), [buyCandidate("a", "A", 4), LEAVE]);
    expect(result).toBeNull();
    vi.doUnmock("../src/ai/advisor/model");
  });
});
