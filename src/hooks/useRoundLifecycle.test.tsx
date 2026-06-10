import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useRoundLifecycle } from "./useRoundLifecycle";
import { useGame } from "../store/game";
import { createCertificateJoker, createMarbleJoker } from "../items/jokers";
import { STARTING_MONEY } from "../store/economy";
import { STARTING_DISCARDS, STARTING_HANDS } from "../store/hand";
import { createGreedyJoker } from "../items/jokers";
import type { Card } from "../cards/types";

function card(id: number): Card {
  return { id, rank: "5", suit: "clubs" };
}

function seedResidue(): void {
  const s = useGame.getState();
  s.setDealt({
    hand: [card(1), card(2), card(3)],
    remaining: [card(4), card(5)],
  });
  s.setChips(120);
  s.setMultiplier(15);
  s.setRoundScore(800);
  s.setScoringEvents([{ kind: "chips-delta", amount: 10, source: "test" }]);
  s.setRemainingHands(0);
  s.setRemainingDiscards(0);
  s.setDiscardsUsedThisRound(3);
  s.setSelectedIds(new Set([1, 2]));
  s.setHandDisplayOrder([3, 2, 1]);
  s.setDiscardingIds(new Set([1]));
  s.setShopOffers([]);
  s.setExtraPackSlots(2);
  s.setPackPicksRemaining(3);
  s.setPendingForcedPacks(["arcana"]);
  s.setPackPreviewHand([card(9)]);
  s.triggerNope();
  s.setHandPlaySignal(7);
  s.setDraggingConsumableIndex(0);
}

function runStartNewGame(): void {
  const { result } = renderHook(() =>
    useRoundLifecycle({
      applyGainedTag: vi.fn(),
      resetScoring: vi.fn(),
      resetDiscardPipeline: vi.fn(),
    }),
  );
  act(() => result.current.startNewGame());
}

function runConfirmRunSelection(): void {
  const { result } = renderHook(() =>
    useRoundLifecycle({
      applyGainedTag: vi.fn(),
      resetScoring: vi.fn(),
      resetDiscardPipeline: vi.fn(),
    }),
  );
  act(() => result.current.confirmRunSelection({ stake: "white", deck: "red-deck" }));
}

function seedStaleRestoredRun(): void {
  const s = useGame.getState();
  s.setAnte(9);
  s.setRound(27);
  s.setBlind(3);
  s.setEndlessMode(true);
  s.setJokers([createGreedyJoker()]);
  s.setScoringEvents([{ kind: "chips-delta", amount: 10, source: "stale" }]);
  s.setMoney(223);
  s.setPendingRunSelect(true);
}

describe("useRoundLifecycle.startNewGame board reset (closes #851)", () => {
  beforeEach(() => {
    seedResidue();
  });

  test("clears the on-screen hand", () => {
    runStartNewGame();
    expect(useGame.getState().dealt.hand.length).toBe(0);
  });

  test("refills the deck pile to a full 52-card deck", () => {
    runStartNewGame();
    expect(useGame.getState().dealt.remaining.length).toBe(52);
  });

  test("resets the chip counter", () => {
    runStartNewGame();
    expect(useGame.getState().chips).toBe(0);
  });

  test("resets the multiplier", () => {
    runStartNewGame();
    expect(useGame.getState().multiplier).toBe(0);
  });

  test("resets the round score", () => {
    runStartNewGame();
    expect(useGame.getState().roundScore).toBe(0);
  });

  test("clears the scoring trace events", () => {
    runStartNewGame();
    expect(useGame.getState().scoringEvents.length).toBe(0);
  });

  test("resets remaining hands to the starting count", () => {
    runStartNewGame();
    expect(useGame.getState().remainingHands).toBe(STARTING_HANDS);
  });

  test("resets remaining discards to the starting count", () => {
    runStartNewGame();
    expect(useGame.getState().remainingDiscards).toBe(STARTING_DISCARDS);
  });

  test("resets discards used this round", () => {
    runStartNewGame();
    expect(useGame.getState().discardsUsedThisRound).toBe(0);
  });

  test("clears the card selection", () => {
    runStartNewGame();
    expect(useGame.getState().selectedIds.size).toBe(0);
  });

  test("clears the dealt-card display order", () => {
    runStartNewGame();
    expect(useGame.getState().handDisplayOrder.length).toBe(0);
  });

  test("clears in-flight discarding ids", () => {
    runStartNewGame();
    expect(useGame.getState().discardingIds.size).toBe(0);
  });

  test("clears shop offers", () => {
    runStartNewGame();
    expect(useGame.getState().shopOffers).toBeNull();
  });

  test("clears extra pack slots", () => {
    runStartNewGame();
    expect(useGame.getState().extraPackSlots).toBe(0);
  });

  test("clears pending pack picks", () => {
    runStartNewGame();
    expect(useGame.getState().packPicksRemaining).toBe(0);
  });

  test("clears pending forced packs", () => {
    runStartNewGame();
    expect(useGame.getState().pendingForcedPacks.length).toBe(0);
  });

  test("clears the pack preview hand", () => {
    runStartNewGame();
    expect(useGame.getState().packPreviewHand.length).toBe(0);
  });

  test("resets the nope animation key", () => {
    runStartNewGame();
    expect(useGame.getState().nopeTriggerKey).toBe(0);
  });

  test("resets the hand-play signal", () => {
    runStartNewGame();
    expect(useGame.getState().handPlaySignal).toBe(0);
  });

  test("clears a dragging consumable index", () => {
    runStartNewGame();
    expect(useGame.getState().draggingConsumableIndex).toBeNull();
  });
});

describe("useRoundLifecycle.confirmRunSelection fully resets a restored stale run (closes #870)", () => {
  beforeEach(() => {
    seedStaleRestoredRun();
  });

  test("resets the ante to 1", () => {
    runConfirmRunSelection();
    expect(useGame.getState().ante).toBe(1);
  });

  test("resets the round to 1", () => {
    runConfirmRunSelection();
    expect(useGame.getState().round).toBe(1);
  });

  test("resets the blind to the Small Blind", () => {
    runConfirmRunSelection();
    expect(useGame.getState().blind).toBe(1);
  });

  test("turns endless mode off", () => {
    runConfirmRunSelection();
    expect(useGame.getState().endlessMode).toBe(false);
  });

  test("removes jokers equipped during the previous run", () => {
    runConfirmRunSelection();
    expect(useGame.getState().jokers.length).toBe(0);
  });

  test("clears the previous run's scoring trace", () => {
    runConfirmRunSelection();
    expect(useGame.getState().scoringEvents.length).toBe(0);
  });

  test("resets money to the starting amount", () => {
    runConfirmRunSelection();
    expect(useGame.getState().money).toBe(STARTING_MONEY);
  });

  test("dismisses the run-select modal", () => {
    runConfirmRunSelection();
    expect(useGame.getState().pendingRunSelect).toBe(false);
  });

  test("re-opens the blind select for the fresh run", () => {
    runConfirmRunSelection();
    expect(useGame.getState().pendingBlindSelect).toBe(true);
  });

  test("negative: startNewGame keeps the run-select modal open instead of dismissing it", () => {
    runStartNewGame();
    expect(useGame.getState().pendingRunSelect).toBe(true);
  });
});

describe("useRoundLifecycle.startNewGame after an endless run (closes #870)", () => {
  test("turns endless mode off", () => {
    useGame.getState().setEndlessMode(true);
    runStartNewGame();
    expect(useGame.getState().endlessMode).toBe(false);
  });
});

describe("useRoundLifecycle.startNewGame preserves the run selection (#851)", () => {
  test("does NOT reset the chosen deck back to the default", () => {
    useGame.getState().setSelectedDeck("blue-deck");
    runStartNewGame();
    expect(useGame.getState().selectedDeck).toBe("blue-deck");
  });

  test("does NOT reset the chosen stake back to the default", () => {
    useGame.getState().setSelectedStake("red");
    runStartNewGame();
    expect(useGame.getState().selectedStake).toBe("red");
  });
});

describe("startNewRound — Marble Joker stone card (#980)", () => {
  test("a new round adds a stone card to addedCards", () => {
    useGame.getState().resetGame();
    useGame.getState().setJokers([createMarbleJoker()]);
    const { result } = renderHook(() =>
      useRoundLifecycle({
        applyGainedTag: vi.fn(),
        resetScoring: vi.fn(),
        resetDiscardPipeline: vi.fn(),
      }),
    );
    act(() => result.current.startNewRound());
    expect(
      useGame.getState().addedCards.filter((c) => c.enhancement === "stone"),
    ).toHaveLength(1);
  });

  test("a new round without Marble Joker adds nothing (negative)", () => {
    useGame.getState().resetGame();
    useGame.getState().setJokers([]);
    const { result } = renderHook(() =>
      useRoundLifecycle({
        applyGainedTag: vi.fn(),
        resetScoring: vi.fn(),
        resetDiscardPipeline: vi.fn(),
      }),
    );
    act(() => result.current.startNewRound());
    expect(useGame.getState().addedCards).toHaveLength(0);
  });
});

describe("startNewRound — Certificate sealed card (#988)", () => {
  test("a new round puts a sealed card in the opening hand", () => {
    useGame.getState().resetGame();
    useGame.getState().setJokers([createCertificateJoker()]);
    const { result } = renderHook(() =>
      useRoundLifecycle({
        applyGainedTag: vi.fn(),
        resetScoring: vi.fn(),
        resetDiscardPipeline: vi.fn(),
      }),
    );
    act(() => result.current.startNewRound());
    expect(
      useGame.getState().dealt.hand.filter((c) => c.seal !== undefined),
    ).toHaveLength(1);
  });

  test("the sealed card persists in addedCards", () => {
    useGame.getState().resetGame();
    useGame.getState().setJokers([createCertificateJoker()]);
    const { result } = renderHook(() =>
      useRoundLifecycle({
        applyGainedTag: vi.fn(),
        resetScoring: vi.fn(),
        resetDiscardPipeline: vi.fn(),
      }),
    );
    act(() => result.current.startNewRound());
    expect(
      useGame.getState().addedCards.filter((c) => c.seal !== undefined),
    ).toHaveLength(1);
  });
});
