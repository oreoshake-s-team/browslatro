// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "../../store/game";
import { humanPlayLog } from "../humanPlayWiring";
import { toModelState } from "../modelState";
import { toModelStateInput } from "./snapshot";
import type { AutopilotDecision } from "./autopilot";
import {
  clearHandAdvice,
  matchedHandDisagreement,
  recordHandDisagreement,
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

describe("recordHandDisagreement", () => {
  test("records an auto-disagreement event for a divergent play", () => {
    rememberHandAdvice(decision());
    recordHandDisagreement(
      { action: "play", cardIds: [3, 4] },
      useGame.getState(),
    );
    expect(humanPlayLog().counts()["advice-feedback"]).toBe(1);
  });

  test("tags the recorded event as auto-disagreement", () => {
    rememberHandAdvice(decision());
    recordHandDisagreement(
      { action: "play", cardIds: [3, 4] },
      useGame.getState(),
    );
    expect(humanPlayLog().toJsonl()).toContain('"source":"auto-disagreement"');
  });

  test("records nothing when the committed move matches the recommendation", () => {
    rememberHandAdvice(decision());
    recordHandDisagreement(
      { action: "play", cardIds: [1, 2] },
      useGame.getState(),
    );
    expect(humanPlayLog().count()).toBe(0);
  });

  test("records nothing when no advice was shown (negative)", () => {
    recordHandDisagreement(
      { action: "play", cardIds: [3, 4] },
      useGame.getState(),
    );
    expect(humanPlayLog().count()).toBe(0);
  });

  test("clears the advice so a later commit does not double-fire", () => {
    rememberHandAdvice(decision());
    recordHandDisagreement(
      { action: "play", cardIds: [3, 4] },
      useGame.getState(),
    );
    expect(matchedHandDisagreement({ action: "discard", cardIds: [5, 6] })).toBeNull();
  });
});
