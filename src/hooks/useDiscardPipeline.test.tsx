import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import { useDiscardPipeline } from "./useDiscardPipeline";
import { useGame } from "../store/game";
import { createGreenJokerJoker } from "../items/jokers";
import {
  createBossCatalog,
  hookRngConfig,
} from "../items/bosses";
import type { Card } from "../cards/types";

function seed(hand: ReadonlyArray<Card>, remaining: ReadonlyArray<Card>): void {
  useGame.getState().setDealt({ hand: [...hand], remaining: [...remaining] });
}

function card(id: number, rank: Card["rank"] = "5", suit: Card["suit"] = "clubs"): Card {
  return { id, rank, suit };
}

function buildDeal(handIds: ReadonlyArray<number>, remainingIds: ReadonlyArray<number> = []) {
  return {
    hand: handIds.map((id) => card(id)),
    remaining: remainingIds.map((id) => card(id)),
  };
}

beforeEach(() => {
  useGame.getState().resetGame();
  hookRngConfig.reset();
});

describe("useDiscardPipeline — negative regression", () => {
  beforeEach(() => {
    useGame.getState().setJokers([]);
    useGame.getState().setRemainingDiscards(3);
  });

  test("a regular discard does NOT add the discarded card ids to destroyedCardIds", () => {
    const a: Card = { id: 1, rank: "A", suit: "spades" };
    const b: Card = { id: 2, rank: "K", suit: "hearts" };
    seed([a, b], []);
    useGame.getState().setSelectedIds(new Set([a.id]));
    const { result } = renderHook(() => useDiscardPipeline());
    act(() => result.current.discardSelected());
    act(() => result.current.handleCardDiscardEnd(a));
    expect(useGame.getState().destroyedCardIds.has(a.id)).toBe(false);
  });

  test("a regular discard removes the discarded card from dealt.hand", () => {
    const a: Card = { id: 1, rank: "A", suit: "spades" };
    const b: Card = { id: 2, rank: "K", suit: "hearts" };
    seed([a, b], []);
    useGame.getState().setSelectedIds(new Set([a.id]));
    const { result } = renderHook(() => useDiscardPipeline());
    act(() => result.current.discardSelected());
    act(() => result.current.handleCardDiscardEnd(a));
    expect(useGame.getState().dealt.hand.map((c) => c.id)).not.toContain(a.id);
  });

  test("destroyedCardIds stays empty across a full discard cycle with no jokers", () => {
    const a: Card = { id: 1, rank: "A", suit: "spades" };
    seed([a], []);
    useGame.getState().setSelectedIds(new Set([a.id]));
    const { result } = renderHook(() => useDiscardPipeline());
    act(() => result.current.discardSelected());
    act(() => result.current.handleCardDiscardEnd(a));
    expect(useGame.getState().destroyedCardIds.size).toBe(0);
  });
});

describe("runDiscard — non-counting discard helper", () => {
  test("removes the requested ids from dealt.hand", () => {
    useGame.getState().setDealt(buildDeal([1, 2, 3, 4, 5]));
    const { result } = renderHook(() => useDiscardPipeline());

    act(() => result.current.runDiscard(new Set([2, 4])));
    act(() => {
      result.current.handleCardDiscardEnd(card(2));
      result.current.handleCardDiscardEnd(card(4));
    });

    const remainingHandIds = useGame
      .getState()
      .dealt.hand.map((c) => c.id)
      .sort((a, b) => a - b);
    expect(remainingHandIds).toEqual([1, 3, 5]);
  });

  test("does NOT decrement remainingDiscards", () => {
    useGame.getState().setDealt(buildDeal([1, 2, 3]));
    useGame.getState().setRemainingDiscards(3);
    const { result } = renderHook(() => useDiscardPipeline());

    act(() => result.current.runDiscard(new Set([1])));
    act(() => {
      result.current.handleCardDiscardEnd(card(1));
    });

    expect(useGame.getState().remainingDiscards).toBe(3);
  });

  test("draws replacements from dealt.remaining up to the hand size", () => {
    useGame.getState().setDealt(buildDeal([1, 2, 3, 4, 5, 6, 7, 8], [9, 10]));
    const { result } = renderHook(() => useDiscardPipeline());

    act(() => result.current.runDiscard(new Set([1, 2])));
    act(() => {
      result.current.handleCardDiscardEnd(card(1));
      result.current.handleCardDiscardEnd(card(2));
    });

    const handIds = useGame.getState().dealt.hand.map((c) => c.id).sort((a, b) => a - b);
    expect(handIds).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test("is a no-op when called with an empty set", () => {
    useGame.getState().setDealt(buildDeal([1, 2, 3]));
    useGame.getState().setRemainingDiscards(2);
    const { result } = renderHook(() => useDiscardPipeline());

    act(() => result.current.runDiscard(new Set()));

    expect(useGame.getState().dealt.hand.map((c) => c.id)).toEqual([1, 2, 3]);
    expect(useGame.getState().remainingDiscards).toBe(2);
  });
});

describe("discardSelected — manual flow (regression for)", () => {
  test("decrements remainingDiscards by 1", () => {
    useGame.getState().setDealt(buildDeal([1, 2, 3]));
    useGame.getState().setSelectedIds(new Set([1]));
    useGame.getState().setRemainingDiscards(3);
    const { result } = renderHook(() => useDiscardPipeline());

    act(() => result.current.discardSelected());

    expect(useGame.getState().remainingDiscards).toBe(2);
  });

  test("increments discardsUsedThisRound by 1", () => {
    useGame.getState().setDealt(buildDeal([1, 2, 3]));
    useGame.getState().setSelectedIds(new Set([2]));
    useGame.getState().setRemainingDiscards(3);
    useGame.getState().setDiscardsUsedThisRound(1);
    const { result } = renderHook(() => useDiscardPipeline());

    act(() => result.current.discardSelected());

    expect(useGame.getState().discardsUsedThisRound).toBe(2);
  });

  test("is a no-op when selectedIds is empty", () => {
    useGame.getState().setDealt(buildDeal([1, 2, 3]));
    useGame.getState().setSelectedIds(new Set());
    useGame.getState().setRemainingDiscards(3);
    const { result } = renderHook(() => useDiscardPipeline());

    act(() => result.current.discardSelected());

    expect(useGame.getState().remainingDiscards).toBe(3);
  });

  test("is a no-op when remainingDiscards is 0", () => {
    useGame.getState().setDealt(buildDeal([1, 2, 3]));
    useGame.getState().setSelectedIds(new Set([1]));
    useGame.getState().setRemainingDiscards(0);
    const { result } = renderHook(() => useDiscardPipeline());

    act(() => result.current.discardSelected());

    expect(useGame.getState().discardingIds.size).toBe(0);
  });
});

describe("The Hook — post-play random held discard", () => {
  function setupHookRound(handIds: ReadonlyArray<number>, remainingIds: ReadonlyArray<number> = []) {
    const hook = createBossCatalog().find((b) => b.id === "the-hook")!;
    useGame.getState().setCurrentBoss(hook);
    useGame.getState().setBlind(3);
    useGame.getState().setDealt(buildDeal(handIds, remainingIds));
    hookRngConfig.rng = () => 0;
  }

  test("discards 2 random non-played held cards after a played hand finalizes", () => {
    setupHookRound([1, 2, 3, 4, 5, 6, 7, 8]);
    const { result } = renderHook(() => useDiscardPipeline());
    result.current.pendingHandPlayResetRef.current = true;
    result.current.pendingDiscardCountRef.current = 1;

    act(() => {
      useGame.getState().setDiscardingIds(new Set([1]));
    });
    act(() => {
      result.current.handleCardDiscardEnd(card(1));
    });

    const hookIds = Array.from(useGame.getState().discardingIds).sort((a, b) => a - b);
    expect(hookIds.length).toBe(2);
    expect(hookIds.every((id) => id !== 1)).toBe(true);
  });

  test("does NOT decrement remainingDiscards when The Hook fires", () => {
    setupHookRound([1, 2, 3, 4, 5, 6, 7, 8]);
    useGame.getState().setRemainingDiscards(3);
    const { result } = renderHook(() => useDiscardPipeline());
    result.current.pendingHandPlayResetRef.current = true;
    result.current.pendingDiscardCountRef.current = 1;

    act(() => {
      useGame.getState().setDiscardingIds(new Set([1]));
    });
    act(() => {
      result.current.handleCardDiscardEnd(card(1));
    });

    expect(useGame.getState().remainingDiscards).toBe(3);
  });

  test("discards what remains when only 1 card is left after scoring", () => {
    setupHookRound([1, 2]);
    const { result } = renderHook(() => useDiscardPipeline());
    result.current.pendingHandPlayResetRef.current = true;
    result.current.pendingDiscardCountRef.current = 1;

    act(() => {
      useGame.getState().setDiscardingIds(new Set([1]));
    });
    act(() => {
      result.current.handleCardDiscardEnd(card(1));
    });

    const hookIds = Array.from(useGame.getState().discardingIds);
    expect(hookIds.length).toBeLessThanOrEqual(1);
  });

  test("is a no-op when 0 non-played cards remain", () => {
    setupHookRound([1]);
    const { result } = renderHook(() => useDiscardPipeline());
    result.current.pendingHandPlayResetRef.current = true;
    result.current.pendingDiscardCountRef.current = 1;

    act(() => {
      useGame.getState().setDiscardingIds(new Set([1]));
    });
    act(() => {
      result.current.handleCardDiscardEnd(card(1));
    });

    expect(useGame.getState().discardingIds.size).toBe(0);
  });

  test("does NOT discard cards involuntarily with a non-Hook boss active (negative)", () => {
    const wall = createBossCatalog().find((b) => b.id === "the-wall")!;
    useGame.getState().setCurrentBoss(wall);
    useGame.getState().setBlind(3);
    useGame.getState().setDealt(buildDeal([1, 2, 3, 4, 5, 6, 7, 8]));
    const { result } = renderHook(() => useDiscardPipeline());
    result.current.pendingHandPlayResetRef.current = true;
    result.current.pendingDiscardCountRef.current = 1;

    act(() => {
      useGame.getState().setDiscardingIds(new Set([1]));
    });
    act(() => {
      result.current.handleCardDiscardEnd(card(1));
    });

    expect(useGame.getState().discardingIds.size).toBe(0);
  });

  test("does NOT fire on non-boss blinds even if currentBoss is The Hook", () => {
    const hook = createBossCatalog().find((b) => b.id === "the-hook")!;
    useGame.getState().setCurrentBoss(hook);
    useGame.getState().setBlind(1);
    useGame.getState().setDealt(buildDeal([1, 2, 3, 4, 5, 6, 7, 8]));
    hookRngConfig.rng = () => 0;
    const { result } = renderHook(() => useDiscardPipeline());
    result.current.pendingHandPlayResetRef.current = true;
    result.current.pendingDiscardCountRef.current = 1;

    act(() => {
      useGame.getState().setDiscardingIds(new Set([1]));
    });
    act(() => {
      result.current.handleCardDiscardEnd(card(1));
    });

    expect(useGame.getState().discardingIds.size).toBe(0);
  });

  test("does NOT fire after a winning hand (skipDrawAfterDiscardRef true)", () => {
    setupHookRound([1, 2, 3, 4, 5, 6, 7, 8]);
    const { result } = renderHook(() => useDiscardPipeline());
    result.current.pendingHandPlayResetRef.current = true;
    result.current.skipDrawAfterDiscardRef.current = true;
    result.current.pendingDiscardCountRef.current = 1;

    act(() => {
      useGame.getState().setDiscardingIds(new Set([1]));
    });
    act(() => {
      result.current.handleCardDiscardEnd(card(1));
    });

    expect(useGame.getState().discardingIds.size).toBe(0);
  });
});

describe("The Serpent — fixed refill count", () => {
  function setupSerpentRound(handIds: ReadonlyArray<number>, remainingIds: ReadonlyArray<number>) {
    const serpent = createBossCatalog().find((b) => b.id === "the-serpent")!;
    useGame.getState().setCurrentBoss(serpent);
    useGame.getState().setBlind(3);
    useGame.getState().setDealt(buildDeal(handIds, remainingIds));
  }

  test("discarding 4 cards refills exactly 3 cards regardless of effective hand size", () => {
    setupSerpentRound([1, 2, 3, 4, 5, 6, 7, 8], [9, 10, 11, 12, 13, 14, 15, 16]);
    useGame.getState().setSelectedIds(new Set([1, 2, 3, 4]));
    useGame.getState().setRemainingDiscards(3);
    const { result } = renderHook(() => useDiscardPipeline());

    act(() => result.current.discardSelected());
    act(() => {
      result.current.handleCardDiscardEnd(card(1));
      result.current.handleCardDiscardEnd(card(2));
      result.current.handleCardDiscardEnd(card(3));
      result.current.handleCardDiscardEnd(card(4));
    });

    expect(useGame.getState().dealt.hand.length).toBe(7);
  });

  test("discarding 1 card under The Serpent grows the hand to 10 (8 − 1 + 3), exceeding normal hand size", () => {
    setupSerpentRound([1, 2, 3, 4, 5, 6, 7, 8], [9, 10, 11, 12, 13, 14, 15, 16]);
    useGame.getState().setSelectedIds(new Set([1]));
    useGame.getState().setRemainingDiscards(3);
    const { result } = renderHook(() => useDiscardPipeline());

    act(() => result.current.discardSelected());
    act(() => {
      result.current.handleCardDiscardEnd(card(1));
    });

    expect(useGame.getState().dealt.hand.length).toBe(10);
  });

  test("clamps the Serpent refill to remaining deck size when deck has fewer than 3 cards", () => {
    setupSerpentRound([1, 2, 3, 4, 5, 6, 7, 8], [9, 10]);
    useGame.getState().setSelectedIds(new Set([1, 2, 3, 4]));
    useGame.getState().setRemainingDiscards(3);
    const { result } = renderHook(() => useDiscardPipeline());

    act(() => result.current.discardSelected());
    act(() => {
      result.current.handleCardDiscardEnd(card(1));
      result.current.handleCardDiscardEnd(card(2));
      result.current.handleCardDiscardEnd(card(3));
      result.current.handleCardDiscardEnd(card(4));
    });

    expect(useGame.getState().dealt.hand.length).toBe(6);
  });

  test("a non-Serpent boss refills to hand-size as usual (negative)", () => {
    const wall = createBossCatalog().find((b) => b.id === "the-wall")!;
    useGame.getState().setCurrentBoss(wall);
    useGame.getState().setBlind(3);
    useGame.getState().setDealt(buildDeal([1, 2, 3, 4, 5, 6, 7, 8], [9, 10, 11, 12]));
    useGame.getState().setSelectedIds(new Set([1, 2, 3, 4]));
    useGame.getState().setRemainingDiscards(3);
    const { result } = renderHook(() => useDiscardPipeline());

    act(() => result.current.discardSelected());
    act(() => {
      result.current.handleCardDiscardEnd(card(1));
      result.current.handleCardDiscardEnd(card(2));
      result.current.handleCardDiscardEnd(card(3));
      result.current.handleCardDiscardEnd(card(4));
    });

    expect(useGame.getState().dealt.hand.length).toBe(8);
  });

  test("does NOT override the refill on a non-boss blind even when currentBoss is The Serpent", () => {
    const serpent = createBossCatalog().find((b) => b.id === "the-serpent")!;
    useGame.getState().setCurrentBoss(serpent);
    useGame.getState().setBlind(1);
    useGame.getState().setDealt(buildDeal([1, 2, 3, 4, 5, 6, 7, 8], [9, 10, 11, 12]));
    useGame.getState().setSelectedIds(new Set([1, 2, 3, 4]));
    useGame.getState().setRemainingDiscards(3);
    const { result } = renderHook(() => useDiscardPipeline());

    act(() => result.current.discardSelected());
    act(() => {
      result.current.handleCardDiscardEnd(card(1));
      result.current.handleCardDiscardEnd(card(2));
      result.current.handleCardDiscardEnd(card(3));
      result.current.handleCardDiscardEnd(card(4));
    });

    expect(useGame.getState().dealt.hand.length).toBe(8);
  });
});

describe("The Fish — face down only after a played hand", () => {
  function setupFishRound(
    handIds: ReadonlyArray<number>,
    remainingIds: ReadonlyArray<number>,
  ) {
    const fish = createBossCatalog().find((b) => b.id === "the-fish")!;
    useGame.getState().setCurrentBoss(fish);
    useGame.getState().setBlind(3);
    useGame.getState().setDealt(buildDeal(handIds, remainingIds));
    useGame.getState().setRemainingDiscards(3);
  }

  test("a discard draws its replacement cards face up", () => {
    setupFishRound([1, 2], [10]);
    useGame.getState().setSelectedIds(new Set([1]));
    const { result } = renderHook(() => useDiscardPipeline());

    act(() => result.current.discardSelected());
    act(() => result.current.handleCardDiscardEnd(card(1)));

    const drawn = useGame.getState().dealt.hand.find((c) => c.id === 10);
    expect(drawn?.faceDown).toBeUndefined();
  });

  test("the refill after a played hand draws face down", () => {
    setupFishRound([1, 2], [10]);
    const { result } = renderHook(() => useDiscardPipeline());
    result.current.pendingHandPlayResetRef.current = true;
    result.current.pendingDiscardCountRef.current = 1;

    act(() => {
      useGame.getState().setDiscardingIds(new Set([1]));
    });
    act(() => {
      result.current.handleCardDiscardEnd(card(1));
    });

    const drawn = useGame.getState().dealt.hand.find((c) => c.id === 10);
    expect(drawn?.faceDown).toBe(true);
  });
});

describe("useDiscardPipeline — Green Joker counter shrinks on discard", () => {
  beforeEach(() => {
    useGame.getState().setRemainingDiscards(3);
  });

  test("a discard shrinks an equipped Green Joker's counter", () => {
    const greenJoker = {
      ...createGreenJokerJoker(),
      state: { kind: "counter", value: 2 } as const,
    };
    useGame.getState().setJokers([greenJoker]);
    seed(buildDeal([1, 2]).hand, []);
    useGame.getState().setSelectedIds(new Set([1]));
    const { result } = renderHook(() => useDiscardPipeline());
    act(() => result.current.discardSelected());
    expect(useGame.getState().jokers[0].state).toEqual({
      kind: "counter",
      value: 1,
    });
  });

  test("a discard with the counter at 0 leaves it at 0 (negative)", () => {
    useGame.getState().setJokers([createGreenJokerJoker()]);
    seed(buildDeal([1, 2]).hand, []);
    useGame.getState().setSelectedIds(new Set([1]));
    const { result } = renderHook(() => useDiscardPipeline());
    act(() => result.current.discardSelected());
    expect(useGame.getState().jokers[0].state).toEqual({
      kind: "counter",
      value: 0,
    });
  });
});

describe("newly drawn ids", () => {
  beforeEach(() => {
    useGame.getState().setJokers([]);
    useGame.getState().setRemainingDiscards(3);
  });

  test("a discard records the replacement card ids as newly drawn", () => {
    seed([card(1), card(2)], [card(10), card(11)]);
    useGame.getState().setSelectedIds(new Set([1]));
    const { result } = renderHook(() => useDiscardPipeline());
    act(() => result.current.discardSelected());
    act(() => result.current.handleCardDiscardEnd(card(1)));
    expect([...useGame.getState().newlyDrawnIds].sort()).toEqual([10, 11]);
  });

  test("negative: kept cards are not in the newly drawn set", () => {
    seed([card(1), card(2)], [card(10)]);
    useGame.getState().setSelectedIds(new Set([1]));
    const { result } = renderHook(() => useDiscardPipeline());
    act(() => result.current.discardSelected());
    act(() => result.current.handleCardDiscardEnd(card(1)));
    expect(useGame.getState().newlyDrawnIds.has(2)).toBe(false);
  });

  test("a discard with an empty deck clears the previous newly drawn set", () => {
    useGame.getState().setNewlyDrawnIds(new Set([99]));
    seed([card(1), card(2)], []);
    useGame.getState().setSelectedIds(new Set([1]));
    const { result } = renderHook(() => useDiscardPipeline());
    act(() => result.current.discardSelected());
    act(() => result.current.handleCardDiscardEnd(card(1)));
    expect(useGame.getState().newlyDrawnIds.size).toBe(0);
  });
});
