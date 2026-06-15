// @vitest-environment node
import { beforeEach, describe, expect, test } from "vitest";
import type { Card } from "../../cards/types";
import { useGame } from "../../store/game";
import type { CandidateRanker } from "../policy";
import { decideAutopilotAction, type AutopilotDecision } from "./autopilot";
import { buildHandPolicyFeedbackEvent } from "./adviceFeedback";
import { ADVISOR_POLICY_MODEL_ID } from "./advisorRanker";

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
