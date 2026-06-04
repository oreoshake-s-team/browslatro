import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import { useConsumableActions } from "./useConsumableActions";
import { useGame } from "../store/game";
import { cardKey } from "../cards/deck";
import { createTarotCatalog } from "../items/tarots";
import type { Consumable } from "../items/consumables";
import type { Card } from "../cards/types";

function hangedManConsumable(): Consumable {
  const tarot = createTarotCatalog().find((t) => t.id === "the-hanged-man");
  if (!tarot) throw new Error("The Hanged Man missing from catalog");
  return { kind: "tarot", card: tarot };
}

function seedHand(cards: ReadonlyArray<Card>): void {
  useGame.getState().setDealt({ hand: [...cards], remaining: [] });
}

describe("useConsumableActions — The Hanged Man", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
    useGame.getState().setConsumables([hangedManConsumable()]);
  });

  test("destroying one selected card removes it from the dealt hand", () => {
    const card: Card = { id: 1, rank: "A", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().dealt.hand).toHaveLength(0);
  });

  test("destroying one selected card adds its rank-suit key to destroyedCardKeys", () => {
    const card: Card = { id: 1, rank: "A", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().destroyedCardKeys.has(cardKey(card))).toBe(true);
  });

  test("destroying consumes the tarot from the consumable list", () => {
    const card: Card = { id: 1, rank: "A", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toHaveLength(0);
  });

  test("destroying two selected cards removes both and keeps the unselected one", () => {
    const a: Card = { id: 1, rank: "A", suit: "spades" };
    const b: Card = { id: 2, rank: "K", suit: "hearts" };
    const c: Card = { id: 3, rank: "Q", suit: "diamonds" };
    seedHand([a, b, c]);
    useGame.getState().setSelectedIds(new Set([a.id, b.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().dealt.hand.map((x) => x.id)).toEqual([c.id]);
  });

  test("destroying clears the selection", () => {
    const card: Card = { id: 1, rank: "A", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().selectedIds.size).toBe(0);
  });

  test("with no cards selected, using The Hanged Man is a no-op (consumable stays)", () => {
    const card: Card = { id: 1, rank: "A", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set());
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toHaveLength(1);
  });

  test("with more than 2 cards selected, using The Hanged Man is a no-op (no destruction)", () => {
    const a: Card = { id: 1, rank: "A", suit: "spades" };
    const b: Card = { id: 2, rank: "K", suit: "hearts" };
    const c: Card = { id: 3, rank: "Q", suit: "diamonds" };
    seedHand([a, b, c]);
    useGame.getState().setSelectedIds(new Set([a.id, b.id, c.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().destroyedCardKeys.size).toBe(0);
  });

  test("destroyed key persists across resetDeck() only via destroyedCardKeys (createDeck excludes it)", () => {
    const card: Card = { id: 1, rank: "A", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    const key = cardKey(card);
    expect(useGame.getState().destroyedCardKeys.has(key)).toBe(true);
  });
});

function strengthConsumable(): Consumable {
  const tarot = createTarotCatalog().find((t) => t.id === "strength");
  if (!tarot) throw new Error("Strength missing from catalog");
  return { kind: "tarot", card: tarot };
}

describe("useConsumableActions — Strength", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
    useGame.getState().setConsumables([strengthConsumable()]);
  });

  test("one selected card has its rank increased by 1 in the dealt hand", () => {
    const card: Card = { id: 1, rank: "5", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().dealt.hand[0]?.rank).toBe("6");
  });

  test("rank-up preserves the card id (no replacement-of-identity for this round)", () => {
    const card: Card = { id: 42, rank: "5", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().dealt.hand[0]?.id).toBe(42);
  });

  test("rank-up preserves the suit", () => {
    const card: Card = { id: 1, rank: "5", suit: "hearts" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().dealt.hand[0]?.suit).toBe("hearts");
  });

  test("rank-up preserves the enhancement", () => {
    const card: Card = { id: 1, rank: "5", suit: "spades", enhancement: "glass" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().dealt.hand[0]?.enhancement).toBe("glass");
  });

  test("King advances to Ace", () => {
    const card: Card = { id: 1, rank: "K", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().dealt.hand[0]?.rank).toBe("A");
  });

  test("Ace wraps to 2 (matches Balatro)", () => {
    const card: Card = { id: 1, rank: "A", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().dealt.hand[0]?.rank).toBe("2");
  });

  test("original rank-suit key is added to destroyedCardKeys (persistent removal of old card)", () => {
    const card: Card = { id: 1, rank: "5", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().destroyedCardKeys.has(cardKey(card))).toBe(true);
  });

  test("new rank-suit card is pushed to addedCards (persistent addition of upgraded card)", () => {
    const card: Card = { id: 1, rank: "5", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    const added = useGame.getState().addedCards;
    expect(added.some((c) => c.rank === "6" && c.suit === "spades")).toBe(true);
  });

  test("Strength is consumed from the consumable list on use", () => {
    const card: Card = { id: 1, rank: "5", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toHaveLength(0);
  });

  test("two selected cards both advance one rank", () => {
    const a: Card = { id: 1, rank: "5", suit: "spades" };
    const b: Card = { id: 2, rank: "J", suit: "hearts" };
    seedHand([a, b]);
    useGame.getState().setSelectedIds(new Set([a.id, b.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    const ranks = useGame.getState().dealt.hand.map((c) => c.rank);
    expect(ranks).toEqual(["6", "Q"]);
  });

  test("with no cards selected, Strength is a no-op (consumable stays)", () => {
    const card: Card = { id: 1, rank: "5", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set());
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toHaveLength(1);
  });

  test("with more than 2 selected, Strength is a no-op (no rank change)", () => {
    const a: Card = { id: 1, rank: "5", suit: "spades" };
    const b: Card = { id: 2, rank: "5", suit: "hearts" };
    const c: Card = { id: 3, rank: "5", suit: "clubs" };
    seedHand([a, b, c]);
    useGame.getState().setSelectedIds(new Set([a.id, b.id, c.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().dealt.hand.map((x) => x.rank)).toEqual([
      "5",
      "5",
      "5",
    ]);
  });
});
