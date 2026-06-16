// @vitest-environment node
import { beforeEach, describe, expect, test } from "vitest";
import type { Card } from "../../cards/types";
import { useGame } from "../../store/game";
import type { CandidateRanker } from "../policy";
import { decideAutopilotAction, type AutopilotDecision } from "./autopilot";
import {
  buildHandPolicyFeedbackEvent,
  buildShopPolicyFeedbackEvent,
} from "./adviceFeedback";
import { ADVISOR_POLICY_MODEL_ID } from "./advisorRanker";
import { SHOP_POLICY_MODEL_ID } from "./shopRanker";
import type { ShopAdviceCandidate, ShopAdviceState } from "./types";

const ranker: CandidateRanker = {
  load: async () => {},
  rank: async (_state, candidates) => candidates.map((_, index) => index),
};

function pairHand(): Card[] {
  return [
    { id: 1, rank: "9", suit: "hearts" },
    { id: 2, rank: "9", suit: "spades" },
    { id: 3, rank: "K", suit: "clubs" },
    { id: 4, rank: "4", suit: "diamonds" },
    { id: 5, rank: "7", suit: "hearts" },
  ];
}

beforeEach(() => {
  useGame.getState().resetGame();
  useGame.getState().setDealt({ hand: pairHand(), remaining: [] });
  useGame.setState({ pendingBlindSelect: false, pendingRunSelect: false });
});

async function decision(): Promise<AutopilotDecision> {
  const d = await decideAutopilotAction(useGame.getState(), ranker);
  if (d === null) throw new Error("expected a decision");
  return d;
}

describe("buildHandPolicyFeedbackEvent", () => {
  test("tags the event as advice feedback", async () => {
    expect(buildHandPolicyFeedbackEvent(await decision(), 1).kind).toBe(
      "advice-feedback",
    );
  });

  test("records the policy advisor kind", async () => {
    expect(buildHandPolicyFeedbackEvent(await decision(), 1).advisorKind).toBe(
      "policy",
    );
  });

  test("records the policy model id", async () => {
    expect(buildHandPolicyFeedbackEvent(await decision(), 1).model).toBe(
      ADVISOR_POLICY_MODEL_ID,
    );
  });

  test("carries the policy's recommendation index", async () => {
    const d = await decision();
    expect(buildHandPolicyFeedbackEvent(d, 1).recommendationIndex).toBe(
      d.recommendationIndex,
    );
  });

  test("records the corrective pick as correctedIndex", async () => {
    expect(buildHandPolicyFeedbackEvent(await decision(), 2).correctedIndex).toBe(
      2,
    );
  });

  test("records a bare downvote as a null corrected index", async () => {
    expect(
      buildHandPolicyFeedbackEvent(await decision(), null).correctedIndex,
    ).toBeNull();
  });

  test("marks the source as an explicit click", async () => {
    expect(buildHandPolicyFeedbackEvent(await decision(), null).source).toBe(
      "explicit",
    );
  });

  test("records an auto-disagreement source when given", async () => {
    expect(
      buildHandPolicyFeedbackEvent(await decision(), 1, "auto-disagreement").source,
    ).toBe("auto-disagreement");
  });

  test("embeds the hand decision context", async () => {
    expect(buildHandPolicyFeedbackEvent(await decision(), 1).decision.context).toBe(
      "hand",
    );
  });

  test("embeds the candidate list the policy scored", async () => {
    const d = await decision();
    expect(
      buildHandPolicyFeedbackEvent(d, 1).decision.candidates.length,
    ).toBe(d.candidates.length);
  });
});

const shopState: ShopAdviceState = {
  money: 9,
  ante: 2,
  jokers: [],
  jokerCapacity: 5,
  consumables: [],
  consumableCapacity: 2,
  ownedVoucherIds: [],
};

const shopCandidates: ShopAdviceCandidate[] = [
  {
    action: "buy",
    item: { itemType: "joker", category: "joker-x-mult", id: "blueprint", name: "Blueprint", description: "", cost: 10 },
  },
  { action: "reroll", cost: 5 },
  { action: "leave" },
];

describe("buildShopPolicyFeedbackEvent", () => {
  test("records the policy advisor kind", () => {
    expect(
      buildShopPolicyFeedbackEvent(shopState, shopCandidates, 0, 1).advisorKind,
    ).toBe("policy");
  });

  test("records the shop policy model id", () => {
    expect(buildShopPolicyFeedbackEvent(shopState, shopCandidates, 0, 1).model).toBe(
      SHOP_POLICY_MODEL_ID,
    );
  });

  test("carries the policy's recommendation index", () => {
    expect(
      buildShopPolicyFeedbackEvent(shopState, shopCandidates, 0, 1).recommendationIndex,
    ).toBe(0);
  });

  test("records the corrective pick", () => {
    expect(
      buildShopPolicyFeedbackEvent(shopState, shopCandidates, 0, 1).correctedIndex,
    ).toBe(1);
  });

  test("records a bare downvote as null", () => {
    expect(
      buildShopPolicyFeedbackEvent(shopState, shopCandidates, 0, null).correctedIndex,
    ).toBeNull();
  });

  test("embeds the shop decision context", () => {
    expect(
      buildShopPolicyFeedbackEvent(shopState, shopCandidates, 0, 1).decision.context,
    ).toBe("shop");
  });

  test("embeds the shop candidate list", () => {
    expect(
      buildShopPolicyFeedbackEvent(shopState, shopCandidates, 0, 1).decision.candidates
        .length,
    ).toBe(3);
  });

  test("defaults the source to an explicit click", () => {
    expect(buildShopPolicyFeedbackEvent(shopState, shopCandidates, 0, 1).source).toBe(
      "explicit",
    );
  });

  test("records an auto-disagreement source when given", () => {
    expect(
      buildShopPolicyFeedbackEvent(
        shopState,
        shopCandidates,
        0,
        1,
        "auto-disagreement",
      ).source,
    ).toBe("auto-disagreement");
  });
});
