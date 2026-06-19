import { beforeEach, describe, expect, test } from "vitest";
import type { Card } from "../cards/types";
import { useGame } from "../store/game";
import { createHumanPlayLog, type HumanPlayLog, type LogStorage } from "./humanPlayLog";
import {
  captureAdviceFeedback,
  captureHumanDecision,
  captureRunEvent,
  setHumanPlayRecordingSuppressed,
} from "./humanPlayWiring";
import type { AdviceFeedbackEvent } from "./runEvents";
import { candidatesFixture, modelStateFixture } from "./advisor/test-helpers";

function feedbackEvent(
  overrides?: Partial<AdviceFeedbackEvent>,
): AdviceFeedbackEvent {
  return {
    kind: "advice-feedback",
    advisorKind: "policy",
    model: "advisor-policy-v9",
    recommendationIndex: 0,
    alternativeIndex: null,
    verdict: "bad",
    correctedIndex: 1,
    source: "explicit",
    decision: {
      context: "hand",
      state: modelStateFixture(),
      candidates: candidatesFixture(),
    },
    ...overrides,
  };
}

function memoryStorage(): LogStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

function pairHand(): Card[] {
  return [
    { id: 1, rank: "9", suit: "hearts" },
    { id: 2, rank: "9", suit: "spades" },
    { id: 3, rank: "K", suit: "clubs" },
    { id: 4, rank: "4", suit: "diamonds" },
    { id: 5, rank: "7", suit: "hearts" },
  ];
}

function makeLog(): HumanPlayLog {
  return createHumanPlayLog(memoryStorage());
}

beforeEach(() => {
  useGame.getState().resetGame();
  useGame.getState().setDealt({ hand: pairHand(), remaining: [] });
});

describe("captureHumanDecision", () => {
  test("records a play decision", () => {
    const log = makeLog();
    const recorded = captureHumanDecision(
      useGame.getState(),
      { kind: "play", cardIds: [1, 2] },
      { log, seed: 7 },
    );
    expect(recorded).toBe(true);
  });

  test("appends the play record to the log", () => {
    const log = makeLog();
    captureHumanDecision(
      useGame.getState(),
      { kind: "play", cardIds: [1, 2] },
      { log, seed: 7 },
    );
    expect(log.count()).toBe(1);
  });

  test("records a discard decision", () => {
    const log = makeLog();
    const recorded = captureHumanDecision(
      useGame.getState(),
      { kind: "discard", cardIds: [3] },
      { log, seed: 7 },
    );
    expect(recorded).toBe(true);
  });

  test("rejects an action referencing cards outside the hand", () => {
    const log = makeLog();
    const recorded = captureHumanDecision(
      useGame.getState(),
      { kind: "play", cardIds: [99] },
      { log, seed: 7 },
    );
    expect(recorded).toBe(false);
  });

  test("does not log a rejected action", () => {
    const log = makeLog();
    captureHumanDecision(
      useGame.getState(),
      { kind: "play", cardIds: [99] },
      { log, seed: 7 },
    );
    expect(log.count()).toBe(0);
  });

  test("reports a storage failure as not recorded", () => {
    const failingLog: HumanPlayLog = {
      append: () => false,
      count: () => 0,
      counts: () => ({}),
      toJsonl: () => "",
      clear: () => {},
    };
    const recorded = captureHumanDecision(
      useGame.getState(),
      { kind: "play", cardIds: [1, 2] },
      { log: failingLog, seed: 7 },
    );
    expect(recorded).toBe(false);
  });


  test("records nothing while recording is suppressed", () => {
    const log = makeLog();
    setHumanPlayRecordingSuppressed(true);
    const recorded = captureHumanDecision(
      useGame.getState(),
      { kind: "play", cardIds: [1, 2] },
      { log, seed: 7 },
    );
    setHumanPlayRecordingSuppressed(false);
    expect(recorded).toBe(false);
  });

  test("records no run events while recording is suppressed", () => {
    const log = makeLog();
    setHumanPlayRecordingSuppressed(true);
    const recorded = captureRunEvent(
      useGame.getState(),
      { kind: "blind-skip", tag: null },
      { log, seed: 7 },
    );
    setHumanPlayRecordingSuppressed(false);
    expect(recorded).toBe(false);
  });

  test("resumes recording once unsuppressed", () => {
    const log = makeLog();
    setHumanPlayRecordingSuppressed(true);
    setHumanPlayRecordingSuppressed(false);
    const recorded = captureHumanDecision(
      useGame.getState(),
      { kind: "play", cardIds: [1, 2] },
      { log, seed: 7 },
    );
    expect(recorded).toBe(true);
  });

  test("swallows recorder exceptions instead of breaking gameplay", () => {
    const throwingLog: HumanPlayLog = {
      append: () => {
        throw new Error("quota");
      },
      count: () => 0,
      counts: () => ({}),
      toJsonl: () => "",
      clear: () => {},
    };
    const recorded = captureHumanDecision(
      useGame.getState(),
      { kind: "play", cardIds: [1, 2] },
      { log: throwingLog, seed: 7 },
    );
    expect(recorded).toBe(false);
  });
});

describe("captureAdviceFeedback", () => {
  test("records an explicit downvote with a corrective pick", () => {
    const log = makeLog();
    const recorded = captureAdviceFeedback(useGame.getState(), feedbackEvent(), {
      log,
      seed: 7,
    });
    expect(recorded).toBe(true);
  });

  test("appends the record under the advice-feedback kind", () => {
    const log = makeLog();
    captureAdviceFeedback(useGame.getState(), feedbackEvent(), { log, seed: 7 });
    expect(log.counts()["advice-feedback"]).toBe(1);
  });

  test("records a bare downvote with no correction (eval-only)", () => {
    const log = makeLog();
    const recorded = captureAdviceFeedback(
      useGame.getState(),
      feedbackEvent({ correctedIndex: null }),
      { log, seed: 7 },
    );
    expect(recorded).toBe(true);
  });

  test("records explicit feedback even while autopilot suppresses move recording", () => {
    const log = makeLog();
    setHumanPlayRecordingSuppressed(true);
    const recorded = captureAdviceFeedback(useGame.getState(), feedbackEvent(), {
      log,
      seed: 7,
    });
    setHumanPlayRecordingSuppressed(false);
    expect(recorded).toBe(true);
  });

  test("appends the feedback record even while recording is suppressed (negative on suppression)", () => {
    const log = makeLog();
    setHumanPlayRecordingSuppressed(true);
    captureAdviceFeedback(useGame.getState(), feedbackEvent(), { log, seed: 7 });
    setHumanPlayRecordingSuppressed(false);
    expect(log.counts()["advice-feedback"]).toBe(1);
  });
});
