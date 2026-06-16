// @vitest-environment node
import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "../store/game";
import {
  buildRunEventRecord,
  type AdviceDecision,
  type AdviceFeedbackEvent,
} from "./runEvents";

beforeEach(() => {
  useGame.getState().resetGame();
});

function feedback(decision: AdviceDecision): AdviceFeedbackEvent {
  return {
    kind: "advice-feedback",
    advisorKind: "policy",
    model: "advisor-shop-policy-v2",
    recommendationIndex: 0,
    alternativeIndex: null,
    verdict: "bad",
    correctedIndex: 1,
    source: "explicit",
    decision,
  };
}

const shopDecision: AdviceDecision = {
  context: "shop",
  state: {
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
      item: { itemType: "joker", category: "joker-mult", id: "j", name: "J", description: "", cost: 5 },
    },
    { action: "leave" },
  ],
};

const packDecision: AdviceDecision = {
  context: "pack",
  state: {
    pool: "arcana",
    variant: "normal",
    picksRemaining: 1,
    money: 9,
    ante: 2,
    jokers: [],
    jokerCapacity: 5,
    consumables: [],
    consumableCapacity: 2,
  },
  candidates: [
    {
      action: "pick",
      option: { optionType: "tarot", category: "tarot-create", id: "the-fool", name: "The Fool", description: "" },
    },
    { action: "skip" },
  ],
};

describe("AdviceDecision contexts", () => {
  test("accepts a shop decision context", () => {
    expect(feedback(shopDecision).decision.context).toBe("shop");
  });

  test("accepts a pack decision context", () => {
    expect(feedback(packDecision).decision.context).toBe("pack");
  });

  test("preserves the shop candidate list through buildRunEventRecord", () => {
    const record = buildRunEventRecord(
      useGame.getState(),
      7,
      feedback(shopDecision),
    );
    expect(
      record.kind === "advice-feedback" && record.decision.candidates.length,
    ).toBe(2);
  });

  test("stamps the run envelope onto the feedback record", () => {
    const record = buildRunEventRecord(
      useGame.getState(),
      7,
      feedback(shopDecision),
    );
    expect(record.schemaVersion).toBe(3);
  });
});
