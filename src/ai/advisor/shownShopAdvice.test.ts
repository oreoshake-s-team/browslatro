// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "../../store/game";
import { humanPlayLog } from "../humanPlayWiring";
import { createDefaultHandStats } from "../../scoring/handStats";
import {
  clearShopAdvice,
  matchedShopAgreement,
  matchedShopDisagreement,
  recordShopFeedback,
  rememberShopAdvice,
  type ShownShopAdvice,
} from "./shownShopAdvice";

function advice(): ShownShopAdvice {
  return {
    shop: {
      money: 9,
      ante: 2,
      jokers: [],
      jokerCapacity: 5,
      consumables: [],
      consumableCapacity: 2,
      ownedVoucherIds: [],
    },
    candidates: [
      {
        action: "buy",
        item: {
          itemType: "joker",
          category: "joker-x-mult",
          id: "blueprint",
          name: "Blueprint",
          description: "",
          cost: 10,
        },
      },
      { action: "reroll", cost: 5 },
      { action: "leave" },
    ],
    actions: [
      { kind: "buy", offerIdx: 0 },
      { kind: "reroll", cost: 5 },
      { kind: "leave" },
    ],
    recommendationIndex: 0,
    rollout: {
      jokers: [],
      handStats: createDefaultHandStats(),
      deck: [],
      offers: [],
    },
  };
}

beforeEach(() => {
  clearShopAdvice();
  window.localStorage.clear();
  useGame.getState().resetGame();
});

describe("matchedShopDisagreement", () => {
  test("returns null when no advice was shown", () => {
    expect(matchedShopDisagreement({ kind: "reroll", cost: 5 })).toBeNull();
  });

  test("flags a divergent action with the committed candidate index", () => {
    rememberShopAdvice(advice());
    expect(matchedShopDisagreement({ kind: "reroll", cost: 5 })?.correctedIndex).toBe(1);
  });

  test("returns null when the committed action matches the recommendation", () => {
    rememberShopAdvice(advice());
    expect(matchedShopDisagreement({ kind: "buy", offerIdx: 0 })).toBeNull();
  });

  test("distinguishes a different offer from the recommended one", () => {
    rememberShopAdvice({ ...advice(), recommendationIndex: 1 });
    expect(matchedShopDisagreement({ kind: "buy", offerIdx: 0 })?.correctedIndex).toBe(0);
  });
});

describe("matchedShopAgreement", () => {
  test("returns null when no advice was shown", () => {
    expect(matchedShopAgreement({ kind: "buy", offerIdx: 0 })).toBeNull();
  });

  test("flags a commit that matches the recommendation", () => {
    rememberShopAdvice(advice());
    expect(
      matchedShopAgreement({ kind: "buy", offerIdx: 0 })?.advice.recommendationIndex,
    ).toBe(0);
  });

  test("returns null when the commit diverges from the recommendation", () => {
    rememberShopAdvice(advice());
    expect(matchedShopAgreement({ kind: "reroll", cost: 5 })).toBeNull();
  });
});

describe("recordShopFeedback", () => {
  test("tags a divergent action as auto-disagreement", () => {
    rememberShopAdvice(advice());
    recordShopFeedback({ kind: "reroll", cost: 5 }, useGame.getState());
    expect(humanPlayLog().toJsonl()).toContain('"source":"auto-disagreement"');
  });

  test("records the committed candidate as correctedIndex", () => {
    rememberShopAdvice(advice());
    recordShopFeedback({ kind: "reroll", cost: 5 }, useGame.getState());
    expect(humanPlayLog().toJsonl()).toContain('"correctedIndex":1');
  });

  test("tags a matching action as auto-agreement", () => {
    rememberShopAdvice(advice());
    recordShopFeedback({ kind: "buy", offerIdx: 0 }, useGame.getState());
    expect(humanPlayLog().toJsonl()).toContain('"source":"auto-agreement"');
  });

  test("tags an agreement event with the good verdict", () => {
    rememberShopAdvice(advice());
    recordShopFeedback({ kind: "buy", offerIdx: 0 }, useGame.getState());
    expect(humanPlayLog().toJsonl()).toContain('"verdict":"good"');
  });

  test("records exactly one event per commit", () => {
    rememberShopAdvice(advice());
    recordShopFeedback({ kind: "buy", offerIdx: 0 }, useGame.getState());
    expect(humanPlayLog().counts()["advice-feedback"]).toBe(1);
  });

  test("records nothing when no advice was shown (negative)", () => {
    recordShopFeedback({ kind: "reroll", cost: 5 }, useGame.getState());
    expect(humanPlayLog().count()).toBe(0);
  });

  test("clears the advice so a later commit does not double-fire", () => {
    rememberShopAdvice(advice());
    recordShopFeedback({ kind: "reroll", cost: 5 }, useGame.getState());
    expect(matchedShopDisagreement({ kind: "leave" })).toBeNull();
  });

  test("carries the remembered rollout state into the recorded event", () => {
    rememberShopAdvice(advice());
    recordShopFeedback({ kind: "reroll", cost: 5 }, useGame.getState());
    const record = JSON.parse(humanPlayLog().toJsonl().trim());
    expect(record.decision.rollout).toBeDefined();
  });
});
