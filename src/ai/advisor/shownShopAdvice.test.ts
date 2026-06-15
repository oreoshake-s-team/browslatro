// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "../../store/game";
import { humanPlayLog } from "../humanPlayWiring";
import {
  clearShopAdvice,
  matchedShopDisagreement,
  recordShopDisagreement,
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

describe("recordShopDisagreement", () => {
  test("records an auto-disagreement event for a divergent action", () => {
    rememberShopAdvice(advice());
    recordShopDisagreement({ kind: "reroll", cost: 5 }, useGame.getState());
    expect(humanPlayLog().counts()["advice-feedback"]).toBe(1);
  });

  test("tags the recorded event as auto-disagreement", () => {
    rememberShopAdvice(advice());
    recordShopDisagreement({ kind: "reroll", cost: 5 }, useGame.getState());
    expect(humanPlayLog().toJsonl()).toContain('"source":"auto-disagreement"');
  });

  test("records the committed candidate as correctedIndex", () => {
    rememberShopAdvice(advice());
    recordShopDisagreement({ kind: "reroll", cost: 5 }, useGame.getState());
    expect(humanPlayLog().toJsonl()).toContain('"correctedIndex":1');
  });

  test("records nothing when the committed action matches the recommendation", () => {
    rememberShopAdvice(advice());
    recordShopDisagreement({ kind: "buy", offerIdx: 0 }, useGame.getState());
    expect(humanPlayLog().count()).toBe(0);
  });

  test("records nothing when no advice was shown (negative)", () => {
    recordShopDisagreement({ kind: "reroll", cost: 5 }, useGame.getState());
    expect(humanPlayLog().count()).toBe(0);
  });

  test("clears the advice so a later commit does not double-fire", () => {
    rememberShopAdvice(advice());
    recordShopDisagreement({ kind: "reroll", cost: 5 }, useGame.getState());
    expect(matchedShopDisagreement({ kind: "leave" })).toBeNull();
  });
});
