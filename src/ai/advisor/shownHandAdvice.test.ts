// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "../../store/game";
import { humanPlayLog } from "../humanPlayWiring";
import { toModelState } from "../modelState";
import { toModelStateInput } from "./snapshot";
import type { AutopilotDecision } from "./autopilot";
import {
  clearHandAdvice,
  matchedHandAgreement,
  matchedHandDisagreement,
  recordHandFeedback,
  rememberHandAdvice,
} from "./shownHandAdvice";

function decision(): AutopilotDecision {
  const play = (cardIds: number[], score: number) =>
    ({
      action: "play" as const,
      cardIds,
      handLabel: "Pair" as const,
      score,
      chips: score / 2,
      mult: 2,
      notes: [],
    });
  return {
    action: play([1, 2], 40),
    candidates: [
      play([1, 2], 40),
      play([3, 4], 30),
      { action: "discard", cardIds: [5, 6], notes: [] },
    ],
    recommendationIndex: 0,
    modelState: toModelState(toModelStateInput(useGame.getState())),
  };
}

beforeEach(() => {
  clearHandAdvice();
  window.localStorage.clear();
  useGame.getState().resetGame();
});

describe("matchedHandDisagreement", () => {
  test("returns null when no advice was shown", () => {
    expect(matchedHandDisagreement({ action: "play", cardIds: [3, 4] })).toBeNull();
  });

  test("flags a divergent play with the committed candidate index", () => {
    rememberHandAdvice(decision());
    expect(
      matchedHandDisagreement({ action: "play", cardIds: [3, 4] })?.correctedIndex,
    ).toBe(1);
  });

  test("matches regardless of card order", () => {
    rememberHandAdvice(decision());
    expect(
      matchedHandDisagreement({ action: "play", cardIds: [4, 3] })?.correctedIndex,
    ).toBe(1);
  });

  test("returns null when the committed move is the recommendation", () => {
    rememberHandAdvice(decision());
    expect(matchedHandDisagreement({ action: "play", cardIds: [1, 2] })).toBeNull();
  });

  test("flags a divergent discard", () => {
    rememberHandAdvice(decision());
    expect(
      matchedHandDisagreement({ action: "discard", cardIds: [5, 6] })?.correctedIndex,
    ).toBe(2);
  });

  test("returns null for a move matching no candidate", () => {
    rememberHandAdvice(decision());
    expect(matchedHandDisagreement({ action: "play", cardIds: [8, 9] })).toBeNull();
  });
});

describe("matchedHandAgreement", () => {
  test("returns null when no advice was shown", () => {
    expect(matchedHandAgreement({ action: "play", cardIds: [1, 2] })).toBeNull();
  });

  test("flags a commit that matches the recommendation", () => {
    rememberHandAdvice(decision());
    expect(
      matchedHandAgreement({ action: "play", cardIds: [1, 2] })?.decision
        .recommendationIndex,
    ).toBe(0);
  });

  test("returns null when the commit diverges from the recommendation", () => {
    rememberHandAdvice(decision());
    expect(matchedHandAgreement({ action: "play", cardIds: [3, 4] })).toBeNull();
  });
});

describe("recordHandFeedback", () => {
  test("records an auto-disagreement event for a divergent play", () => {
    rememberHandAdvice(decision());
    recordHandFeedback({ action: "play", cardIds: [3, 4] }, useGame.getState());
    expect(humanPlayLog().toJsonl()).toContain('"source":"auto-disagreement"');
  });

  test("records an auto-agreement event when the commit matches the recommendation", () => {
    rememberHandAdvice(decision());
    recordHandFeedback({ action: "play", cardIds: [1, 2] }, useGame.getState());
    expect(humanPlayLog().toJsonl()).toContain('"source":"auto-agreement"');
  });

  test("tags an agreement event with the good verdict", () => {
    rememberHandAdvice(decision());
    recordHandFeedback({ action: "play", cardIds: [1, 2] }, useGame.getState());
    expect(humanPlayLog().toJsonl()).toContain('"verdict":"good"');
  });

  test("records exactly one event per commit", () => {
    rememberHandAdvice(decision());
    recordHandFeedback({ action: "play", cardIds: [1, 2] }, useGame.getState());
    expect(humanPlayLog().counts()["advice-feedback"]).toBe(1);
  });

  test("records nothing when no advice was shown (negative)", () => {
    recordHandFeedback({ action: "play", cardIds: [3, 4] }, useGame.getState());
    expect(humanPlayLog().count()).toBe(0);
  });

  test("records nothing for a commit matching no candidate", () => {
    rememberHandAdvice(decision());
    recordHandFeedback({ action: "play", cardIds: [8, 9] }, useGame.getState());
    expect(humanPlayLog().count()).toBe(0);
  });

  test("clears the advice so a later commit does not double-fire", () => {
    rememberHandAdvice(decision());
    recordHandFeedback({ action: "play", cardIds: [3, 4] }, useGame.getState());
    expect(matchedHandDisagreement({ action: "discard", cardIds: [5, 6] })).toBeNull();
  });
});
