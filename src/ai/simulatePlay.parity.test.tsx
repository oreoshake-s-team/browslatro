import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Card } from "../cards/types";
import { createJokerCatalog } from "../items/jokers";
import type { Joker } from "../items/jokers/types";
import { useGame } from "../store/game";
import { usePlayHand, type UsePlayHandParams } from "../hooks/usePlayHand";
import { toSimulatePlayInput } from "./advisor/snapshot";
import { simulatePlay } from "./simulatePlay";

function card(id: number, rank: Card["rank"], suit: Card["suit"]): Card {
  return { id, rank, suit };
}

const PAIR_WITH_FACES: ReadonlyArray<Card> = [
  card(1, "K", "hearts"),
  card(2, "K", "spades"),
  card(3, "Q", "diamonds"),
  card(4, "7", "clubs"),
  card(5, "2", "hearts"),
];

const STRAIGHT_FLUSH: ReadonlyArray<Card> = [
  card(1, "5", "spades"),
  card(2, "6", "spades"),
  card(3, "7", "spades"),
  card(4, "8", "spades"),
  card(5, "9", "spades"),
];

const REMAINING: ReadonlyArray<Card> = [
  card(11, "3", "diamonds"),
  card(12, "4", "clubs"),
  card(13, "10", "hearts"),
  card(14, "J", "clubs"),
  card(15, "A", "diamonds"),
];

function makeParams(): UsePlayHandParams {
  return {
    stepMs: 0,
    loseGame: vi.fn(),
    pendingDiscardCountRef: { current: 0 },
    pendingHandPlayResetRef: { current: false },
    skipDrawAfterDiscardRef: { current: false },
  };
}

function flushScoring(): void {
  for (let i = 0; i < 60; i += 1) {
    if (vi.getTimerCount() === 0) return;
    act(() => {
      vi.runOnlyPendingTimers();
    });
  }
  throw new Error("scoring sequence did not finish within 60 flushes");
}

function realScore(
  jokers: ReadonlyArray<Joker>,
  hand: ReadonlyArray<Card>,
): { readonly simulated: number; readonly real: number } {
  useGame.getState().resetGame();
  const game = useGame.getState();
  game.setBlind(1);
  game.setDealt({ hand: [...hand], remaining: [...REMAINING] });
  game.setHandDisplayOrder(hand.map((c) => c.id));
  game.setSelectedIds(new Set(hand.map((c) => c.id)));
  game.setJokers([...jokers]);
  game.setRemainingHands(4);
  game.setRoundScore(0);

  const ids = hand.map((c) => c.id);
  const simulated = simulatePlay(
    { ...toSimulatePlayInput(useGame.getState()), optimizeJokerOrder: false },
    ids,
  );
  if (!simulated.legal) {
    throw new Error(`simulatePlay refused the play: ${simulated.reason}`);
  }

  const { result, unmount } = renderHook(() => usePlayHand(makeParams()));
  act(() => result.current.submitHand());
  flushScoring();
  unmount();
  return { simulated: simulated.score, real: useGame.getState().roundScore };
}

function rollsChance(joker: Joker): boolean {
  return "chance" in joker.effect || joker.effect.kind === "additive-mult-random";
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  act(() => {
    vi.runOnlyPendingTimers();
  });
  vi.useRealTimers();
});

describe("simulatePlay parity with the eager scoring pass", () => {
  test("agrees with usePlayHand on a plain pair with no jokers", () => {
    const { simulated, real } = realScore([], PAIR_WITH_FACES);
    expect(real).toBe(simulated);
  });

  test("agrees with usePlayHand on a straight flush with no jokers", () => {
    const { simulated, real } = realScore([], STRAIGHT_FLUSH);
    expect(real).toBe(simulated);
  });

  const deterministic = createJokerCatalog().filter((j) => !rollsChance(j));
  const skipped = createJokerCatalog().filter(rollsChance);

  test("the chance-roll skip list stays small and explicit", () => {
    expect(skipped.map((j) => j.id).length).toBeLessThanOrEqual(12);
  });

  describe.each([
    ["pair with faces", PAIR_WITH_FACES],
    ["straight flush", STRAIGHT_FLUSH],
  ])("every deterministic joker — %s", (_label, hand) => {
    test.each(deterministic.map((j) => [j.id, j] as const))(
      "%s scores identically in simulatePlay and usePlayHand",
      (_id, joker) => {
        const { simulated, real } = realScore([joker], hand);
        expect(real).toBe(simulated);
      },
    );
  });

  test("a mixed additive and times mult pair agrees in played order", () => {
    const catalog = createJokerCatalog();
    const additive = catalog.find((j) => j.effect.kind === "additive-mult");
    const times = catalog.find((j) => j.effect.kind === "on-hand-type-x-mult");
    if (additive === undefined || times === undefined) {
      throw new Error("expected additive and x-mult jokers in the catalog");
    }
    const { simulated, real } = realScore([times, additive], PAIR_WITH_FACES);
    expect(real).toBe(simulated);
  });

  test("the same mixed pair agrees in the opposite order", () => {
    const catalog = createJokerCatalog();
    const additive = catalog.find((j) => j.effect.kind === "additive-mult");
    const times = catalog.find((j) => j.effect.kind === "on-hand-type-x-mult");
    if (additive === undefined || times === undefined) {
      throw new Error("expected additive and x-mult jokers in the catalog");
    }
    const { simulated, real } = realScore([additive, times], PAIR_WITH_FACES);
    expect(real).toBe(simulated);
  });
});
