// @vitest-environment node
import { beforeEach, describe, expect, test } from "vitest";
import type { Card } from "../../cards/types";
import { useGame } from "../../store/game";
import type { CandidateRanker } from "../policy";
import { autopilotIdle, chooseAutopilotAction } from "./autopilot";

function pairHand(): Card[] {
  return [
    { id: 1, rank: "9", suit: "hearts" },
    { id: 2, rank: "9", suit: "spades" },
    { id: 3, rank: "K", suit: "clubs" },
    { id: 4, rank: "4", suit: "diamonds" },
    { id: 5, rank: "7", suit: "hearts" },
  ];
}

const passthroughRanker: CandidateRanker = {
  load: async () => {},
  rank: async (_state, candidates) => candidates.map((_, index) => index),
};

function makePlayable(): void {
  useGame.getState().setDealt({ hand: pairHand(), remaining: [] });
  useGame.setState({ pendingBlindSelect: false, pendingRunSelect: false });
}

beforeEach(() => {
  useGame.getState().resetGame();
  makePlayable();
});

describe("autopilotIdle", () => {
  test("is true in a clean playing state", () => {
    expect(autopilotIdle(useGame.getState())).toBe(true);
  });

  test("is false while the round-won modal is pending", () => {
    useGame.setState({
      pendingWin: { roundScore: 400, requiredScore: 300, reward: 5 },
    } as never);
    expect(autopilotIdle(useGame.getState())).toBe(false);
  });

  test("is false while the shop is open", () => {
    useGame.setState({ shopOffers: [] });
    expect(autopilotIdle(useGame.getState())).toBe(false);
  });

  test("is false during blind selection", () => {
    useGame.setState({ pendingBlindSelect: true });
    expect(autopilotIdle(useGame.getState())).toBe(false);
  });

  test("is false with no hands remaining", () => {
    useGame.setState({ remainingHands: 0 });
    expect(autopilotIdle(useGame.getState())).toBe(false);
  });

  test("is false with an empty hand", () => {
    useGame.getState().setDealt({ hand: [], remaining: [] });
    expect(autopilotIdle(useGame.getState())).toBe(false);
  });
});

describe("chooseAutopilotAction", () => {
  test("returns the ranker's top candidate", async () => {
    const action = await chooseAutopilotAction(
      useGame.getState(),
      passthroughRanker,
    );
    expect(action).not.toBeNull();
  });

  test("respects a ranker that prefers another candidate", async () => {
    const lastRanker: CandidateRanker = {
      load: async () => {},
      rank: async (_state, candidates) =>
        candidates.map((_, index) => index).reverse(),
    };
    const first = await chooseAutopilotAction(
      useGame.getState(),
      passthroughRanker,
    );
    const last = await chooseAutopilotAction(useGame.getState(), lastRanker);
    expect(last).not.toEqual(first);
  });

  test("returns null when the hand is empty", async () => {
    useGame.getState().setDealt({ hand: [], remaining: [] });
    expect(
      await chooseAutopilotAction(useGame.getState(), passthroughRanker),
    ).toBeNull();
  });
});
