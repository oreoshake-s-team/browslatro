import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import { useConsumableActions } from "./useConsumableActions";
import { useGame } from "../store/game";
import { createTarotCatalog } from "../items/tarots";
import { MAX_JOKERS, createJokerCatalog } from "../items/jokers";
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

  test("destroying one selected card adds its id to destroyedCardIds", () => {
    const card: Card = { id: 1, rank: "A", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().destroyedCardIds.has(card.id)).toBe(true);
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
    expect(useGame.getState().destroyedCardIds.size).toBe(0);
  });

  test("destroyed id persists in destroyedCardIds after the action", () => {
    const card: Card = { id: 1, rank: "A", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().destroyedCardIds.has(card.id)).toBe(true);
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

  test("original card id is added to destroyedCardIds (persistent removal of old card)", () => {
    const card: Card = { id: 1, rank: "5", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().destroyedCardIds.has(card.id)).toBe(true);
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

function hermitConsumable(): Consumable {
  const tarot = createTarotCatalog().find((t) => t.id === "the-hermit");
  if (!tarot) throw new Error("The Hermit missing from catalog");
  return { kind: "tarot", card: tarot };
}

function plutoConsumable(): Consumable {
  return {
    kind: "planet",
    card: {
      id: "pluto",
      name: "Pluto",
      description: "test",
      hands: ["High Card"],
      chipsDelta: 10,
      multDelta: 1,
    },
  };
}

function blackHoleConsumable(): Consumable {
  return {
    kind: "spectral",
    card: {
      id: "black-hole",
      name: "Black Hole",
      description: "test",
      effect: { kind: "black-hole" },
    },
  };
}

function foolConsumable(): Consumable {
  return {
    kind: "tarot",
    card: {
      id: "the-fool",
      name: "The Fool",
      description: "test",
      effect: { kind: "money-multiply", multiplier: 1, bonusCap: 0 },
    },
  };
}

describe("useConsumableActions — lastUsedConsumable tracking (#615)", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("using a tarot records it as lastUsedConsumable", () => {
    const hermit = hermitConsumable();
    useGame.getState().setConsumables([hermit]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().lastUsedConsumable).toEqual(hermit);
  });

  test("using a planet records it as lastUsedConsumable", () => {
    const pluto = plutoConsumable();
    useGame.getState().setConsumables([pluto]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().lastUsedConsumable).toEqual(pluto);
  });

  test("using a spectral does not update lastUsedConsumable", () => {
    useGame.getState().setConsumables([blackHoleConsumable()]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().lastUsedConsumable).toBeNull();
  });

  test("a spectral used after a tarot leaves the previous tarot as lastUsedConsumable", () => {
    const hermit = hermitConsumable();
    useGame.getState().setConsumables([hermit, blackHoleConsumable()]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().lastUsedConsumable).toEqual(hermit);
  });

  test("using The Fool does not update lastUsedConsumable (it would copy itself)", () => {
    useGame.getState().setConsumables([foolConsumable()]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().lastUsedConsumable).toBeNull();
  });

  test("using The Fool after a tarot leaves the previous tarot as lastUsedConsumable", () => {
    const hermit = hermitConsumable();
    useGame.getState().setConsumables([hermit, foolConsumable()]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().lastUsedConsumable).toEqual(hermit);
  });
});

function suitConversionConsumable(id: string): Consumable {
  const tarot = createTarotCatalog().find((t) => t.id === id);
  if (!tarot) throw new Error(`${id} missing from catalog`);
  return { kind: "tarot", card: tarot };
}

describe("useConsumableActions — The Sun (suit-conversion)", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
    useGame.getState().setConsumables([suitConversionConsumable("the-sun")]);
  });

  test("converts one selected card to hearts in the dealt hand", () => {
    const card: Card = { id: 1, rank: "5", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().dealt.hand[0]?.suit).toBe("hearts");
  });

  test("preserves the rank of the converted card", () => {
    const card: Card = { id: 1, rank: "Q", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().dealt.hand[0]?.rank).toBe("Q");
  });

  test("preserves the enhancement of the converted card", () => {
    const card: Card = { id: 1, rank: "5", suit: "spades", enhancement: "glass" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().dealt.hand[0]?.enhancement).toBe("glass");
  });

  test("original card id is added to destroyedCardIds (persistent removal)", () => {
    const card: Card = { id: 7, rank: "5", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().destroyedCardIds.has(7)).toBe(true);
  });

  test("new converted card is pushed to addedCards (persistent addition)", () => {
    const card: Card = { id: 1, rank: "5", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    const added = useGame.getState().addedCards;
    expect(added.some((c) => c.suit === "hearts" && c.rank === "5")).toBe(true);
  });

  test("leaves non-selected cards unchanged (negative)", () => {
    const a: Card = { id: 1, rank: "5", suit: "spades" };
    const b: Card = { id: 2, rank: "5", suit: "clubs" };
    seedHand([a, b]);
    useGame.getState().setSelectedIds(new Set([a.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().dealt.hand[1]?.suit).toBe("clubs");
  });

  test("converts three selected cards", () => {
    const a: Card = { id: 1, rank: "5", suit: "spades" };
    const b: Card = { id: 2, rank: "6", suit: "clubs" };
    const c: Card = { id: 3, rank: "7", suit: "diamonds" };
    seedHand([a, b, c]);
    useGame.getState().setSelectedIds(new Set([a.id, b.id, c.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    const suits = useGame.getState().dealt.hand.map((x) => x.suit);
    expect(suits).toEqual(["hearts", "hearts", "hearts"]);
  });

  test("with no cards selected, The Sun is a no-op (consumable stays)", () => {
    const card: Card = { id: 1, rank: "5", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set());
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toHaveLength(1);
  });

  test("with more than 3 selected, The Sun is a no-op (no suit change)", () => {
    const a: Card = { id: 1, rank: "5", suit: "spades" };
    const b: Card = { id: 2, rank: "6", suit: "clubs" };
    const c: Card = { id: 3, rank: "7", suit: "diamonds" };
    const d: Card = { id: 4, rank: "8", suit: "spades" };
    seedHand([a, b, c, d]);
    useGame.getState().setSelectedIds(new Set([a.id, b.id, c.id, d.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().dealt.hand.map((x) => x.suit)).toEqual([
      "spades",
      "clubs",
      "diamonds",
      "spades",
    ]);
  });

  test("The Sun is consumed from the consumable list on use", () => {
    const card: Card = { id: 1, rank: "5", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toHaveLength(0);
  });
});

describe("useConsumableActions — The Star (suit-conversion) on pack-preview", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
    useGame.getState().setConsumables([suitConversionConsumable("the-star")]);
  });

  test("converts selected preview cards to diamonds", () => {
    const card: Card = { id: 10, rank: "K", suit: "spades" };
    useGame.getState().setOpenedPack({
      pool: "standard",
      variant: "normal",
      options: [],
    });
    useGame.getState().setPackPreviewHand([card]);
    useGame.getState().setPackPreviewSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().packPreviewHand[0]?.suit).toBe("diamonds");
  });

  test("clears the preview selection after applying", () => {
    const card: Card = { id: 11, rank: "K", suit: "spades" };
    useGame.getState().setOpenedPack({
      pool: "standard",
      variant: "normal",
      options: [],
    });
    useGame.getState().setPackPreviewHand([card]);
    useGame.getState().setPackPreviewSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().packPreviewSelectedIds.size).toBe(0);
  });
});

function deathConsumable(): Consumable {
  const tarot = createTarotCatalog().find((t) => t.id === "death");
  if (!tarot) throw new Error("Death missing from catalog");
  return { kind: "tarot", card: tarot };
}

describe("useConsumableActions — Death", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
    useGame.getState().setConsumables([deathConsumable()]);
  });

  test("left card becomes a copy of the right card (rank)", () => {
    const left: Card = { id: 1, rank: "2", suit: "spades" };
    const right: Card = { id: 2, rank: "K", suit: "hearts" };
    seedHand([left, right]);
    useGame.getState().setHandDisplayOrder([left.id, right.id]);
    useGame.getState().setSelectedIds(new Set([left.id, right.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().dealt.hand[0]?.rank).toBe("K");
  });

  test("left card becomes a copy of the right card (suit)", () => {
    const left: Card = { id: 1, rank: "2", suit: "spades" };
    const right: Card = { id: 2, rank: "K", suit: "hearts" };
    seedHand([left, right]);
    useGame.getState().setHandDisplayOrder([left.id, right.id]);
    useGame.getState().setSelectedIds(new Set([left.id, right.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().dealt.hand[0]?.suit).toBe("hearts");
  });

  test("left card keeps its own id (stable React key)", () => {
    const left: Card = { id: 1, rank: "2", suit: "spades" };
    const right: Card = { id: 2, rank: "K", suit: "hearts" };
    seedHand([left, right]);
    useGame.getState().setHandDisplayOrder([left.id, right.id]);
    useGame.getState().setSelectedIds(new Set([left.id, right.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().dealt.hand[0]?.id).toBe(1);
  });

  test("right card is unchanged", () => {
    const left: Card = { id: 1, rank: "2", suit: "spades" };
    const right: Card = { id: 2, rank: "K", suit: "hearts" };
    seedHand([left, right]);
    useGame.getState().setHandDisplayOrder([left.id, right.id]);
    useGame.getState().setSelectedIds(new Set([left.id, right.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().dealt.hand[1]).toEqual(right);
  });

  test("left/right ordering follows handDisplayOrder, not Set insertion", () => {
    const a: Card = { id: 1, rank: "2", suit: "spades" };
    const b: Card = { id: 2, rank: "K", suit: "hearts" };
    seedHand([a, b]);
    useGame.getState().setHandDisplayOrder([b.id, a.id]);
    useGame.getState().setSelectedIds(new Set([a.id, b.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().dealt.hand.find((c) => c.id === b.id)?.rank).toBe(
      "2",
    );
  });

  test("copies enhancement/seal/edition from the right card", () => {
    const left: Card = { id: 1, rank: "2", suit: "spades" };
    const right: Card = {
      id: 2,
      rank: "K",
      suit: "hearts",
      enhancement: "glass",
      seal: "gold",
      edition: "foil",
    };
    seedHand([left, right]);
    useGame.getState().setHandDisplayOrder([left.id, right.id]);
    useGame.getState().setSelectedIds(new Set([left.id, right.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().dealt.hand[0]).toEqual({
      id: 1,
      rank: "K",
      suit: "hearts",
      enhancement: "glass",
      seal: "gold",
      edition: "foil",
    });
  });

  test("Death is consumed from the consumable list on use", () => {
    const left: Card = { id: 1, rank: "2", suit: "spades" };
    const right: Card = { id: 2, rank: "K", suit: "hearts" };
    seedHand([left, right]);
    useGame.getState().setHandDisplayOrder([left.id, right.id]);
    useGame.getState().setSelectedIds(new Set([left.id, right.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toHaveLength(0);
  });

  test("selection is cleared after use", () => {
    const left: Card = { id: 1, rank: "2", suit: "spades" };
    const right: Card = { id: 2, rank: "K", suit: "hearts" };
    seedHand([left, right]);
    useGame.getState().setHandDisplayOrder([left.id, right.id]);
    useGame.getState().setSelectedIds(new Set([left.id, right.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().selectedIds.size).toBe(0);
  });

  test("with 1 selected card, Death is a no-op (consumable stays)", () => {
    const left: Card = { id: 1, rank: "2", suit: "spades" };
    seedHand([left]);
    useGame.getState().setHandDisplayOrder([left.id]);
    useGame.getState().setSelectedIds(new Set([left.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toHaveLength(1);
  });

  test("with 3 selected cards, Death is a no-op (consumable stays)", () => {
    const a: Card = { id: 1, rank: "2", suit: "spades" };
    const b: Card = { id: 2, rank: "K", suit: "hearts" };
    const c: Card = { id: 3, rank: "5", suit: "clubs" };
    seedHand([a, b, c]);
    useGame.getState().setHandDisplayOrder([a.id, b.id, c.id]);
    useGame.getState().setSelectedIds(new Set([a.id, b.id, c.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toHaveLength(1);
  });

  test("cards not in handDisplayOrder are appended in dealt.hand order (left/right still resolves)", () => {
    const left: Card = { id: 10, rank: "2", suit: "spades" };
    const right: Card = { id: 20, rank: "K", suit: "hearts" };
    seedHand([left, right]);
    useGame.getState().setHandDisplayOrder([]);
    useGame.getState().setSelectedIds(new Set([left.id, right.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().dealt.hand[0]?.rank).toBe("K");
  });
});

function judgementConsumable(): Consumable {
  const tarot = createTarotCatalog().find((t) => t.id === "judgement");
  if (!tarot) throw new Error("Judgement missing from catalog");
  return { kind: "tarot", card: tarot };
}

describe("useConsumableActions — Judgement (#618)", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
    useGame.getState().setConsumables([judgementConsumable()]);
    useGame.getState().setJokers([]);
  });

  test("using Judgement adds a joker to the equipped row", () => {
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().jokers.length).toBe(1);
  });

  test("using Judgement consumes the tarot from the consumable list", () => {
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toHaveLength(0);
  });

  test("at joker capacity, Judgement is a no-op and the tarot is NOT consumed (matches Balatro)", () => {
    const catalog = createJokerCatalog();
    useGame.getState().setJokers(catalog.slice(0, MAX_JOKERS));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toHaveLength(1);
  });

  test("at joker capacity, no extra joker is added (negative)", () => {
    const catalog = createJokerCatalog();
    const equipped = catalog.slice(0, MAX_JOKERS);
    useGame.getState().setJokers(equipped);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().jokers.length).toBe(MAX_JOKERS);
  });

  test("the created joker is not a duplicate of any already-equipped joker", () => {
    const catalog = createJokerCatalog();
    const ownedIds = new Set(catalog.slice(0, 3).map((j) => j.id));
    useGame.getState().setJokers(catalog.slice(0, 3));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    const newest = useGame.getState().jokers[useGame.getState().jokers.length - 1];
    expect(ownedIds.has(newest.id)).toBe(false);
  });
});
