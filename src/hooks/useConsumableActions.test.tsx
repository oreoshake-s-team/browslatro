import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import { useConsumableActions } from "./useConsumableActions";
import { useGame } from "../store/game";
import { humanPlayLog } from "../ai/humanPlayWiring";
import { createTarotCatalog } from "../items/tarots";
import { CRYPTID_COPY_COUNT, createSpectralCatalog } from "../items/spectrals";
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
  const tarot = createTarotCatalog().find((t) => t.id === "the-fool");
  if (!tarot) throw new Error("The Fool missing from catalog");
  return { kind: "tarot", card: tarot };
}

describe("useConsumableActions — lastUsedConsumable tracking", () => {
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

describe("useConsumableActions — Judgement", () => {
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

function emperorConsumable(): Consumable {
  const tarot = createTarotCatalog().find((t) => t.id === "the-emperor");
  if (!tarot) throw new Error("The Emperor missing from catalog");
  return { kind: "tarot", card: tarot };
}

describe("useConsumableActions — The Emperor", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("with both slots free after consuming Emperor, adds exactly 2 tarots", () => {
    useGame.getState().setConsumables([emperorConsumable()]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toHaveLength(2);
  });

  test("with one tarot slot already taken alongside Emperor, adds exactly 1 tarot", () => {
    useGame.getState().setConsumables([emperorConsumable(), hangedManConsumable()]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toHaveLength(2);
  });

  test("with no free slots remaining after Emperor leaves, adds 0 tarots", () => {
    useGame
      .getState()
      .setConsumables([
        emperorConsumable(),
        hangedManConsumable(),
        strengthConsumable(),
      ]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toHaveLength(2);
  });

  test("with no free slots, The Emperor is still consumed (wasted, matches Balatro)", () => {
    useGame
      .getState()
      .setConsumables([
        emperorConsumable(),
        hangedManConsumable(),
        strengthConsumable(),
      ]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    const ids = useGame.getState().consumables.map((c) => c.card.id);
    expect(ids.includes("the-emperor")).toBe(false);
  });

  test("every added consumable is a valid Tarot from the catalog", () => {
    useGame.getState().setConsumables([emperorConsumable()]);
    const validIds = new Set(createTarotCatalog().map((t) => t.id));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    const added = useGame.getState().consumables;
    const allValid = added.every(
      (c) => c.kind === "tarot" && validIds.has(c.card.id),
    );
    expect(allValid).toBe(true);
  });

  test("none of the added consumables is The Emperor itself (filters self)", () => {
    useGame.getState().setConsumables([emperorConsumable()]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    const ids = useGame.getState().consumables.map((c) => c.card.id);
    expect(ids.includes("the-emperor")).toBe(false);
  });

  test("negative: using The Hanged Man does not add any tarot to the tray", () => {
    const card: Card = { id: 1, rank: "A", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    useGame.getState().setConsumables([hangedManConsumable()]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toHaveLength(0);
  });

  describe("with 3 consumable slots (Crystal Ball voucher)", () => {
    beforeEach(() => {
      useGame.getState().setOwnedVoucherIds(new Set(["crystal-ball"]));
    });

    test("with 0 other consumables, adds 2 tarots", () => {
      useGame.getState().setConsumables([emperorConsumable()]);
      const { result } = renderHook(() => useConsumableActions());
      act(() => result.current.useConsumable(0));
      expect(useGame.getState().consumables).toHaveLength(2);
    });

    test("with 1 other consumable, adds 2 tarots (fills the 2 free slots)", () => {
      useGame
        .getState()
        .setConsumables([emperorConsumable(), hangedManConsumable()]);
      const { result } = renderHook(() => useConsumableActions());
      act(() => result.current.useConsumable(0));
      expect(useGame.getState().consumables).toHaveLength(3);
    });

    test("with 2 other consumables, adds 1 tarot (only 1 free slot after Emperor consumed)", () => {
      useGame
        .getState()
        .setConsumables([
          emperorConsumable(),
          hangedManConsumable(),
          strengthConsumable(),
        ]);
      const { result } = renderHook(() => useConsumableActions());
      act(() => result.current.useConsumable(0));
      expect(useGame.getState().consumables).toHaveLength(3);
    });
  });
});

function highPriestessConsumable(): Consumable {
  const tarot = createTarotCatalog().find((t) => t.id === "the-high-priestess");
  if (!tarot) throw new Error("The High Priestess missing from catalog");
  return { kind: "tarot", card: tarot };
}

describe("useConsumableActions — The High Priestess", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("with both slots free after consuming High Priestess, adds exactly 2 planets", () => {
    useGame.getState().setConsumables([highPriestessConsumable()]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toHaveLength(2);
  });

  test("with one tarot slot already taken alongside High Priestess, adds exactly 1 planet", () => {
    useGame
      .getState()
      .setConsumables([highPriestessConsumable(), hangedManConsumable()]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toHaveLength(2);
  });

  test("with no free slots remaining after High Priestess leaves, adds 0 planets", () => {
    useGame
      .getState()
      .setConsumables([
        highPriestessConsumable(),
        hangedManConsumable(),
        strengthConsumable(),
      ]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toHaveLength(2);
  });

  test("with no free slots, The High Priestess is still consumed (wasted, matches Balatro)", () => {
    useGame
      .getState()
      .setConsumables([
        highPriestessConsumable(),
        hangedManConsumable(),
        strengthConsumable(),
      ]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    const ids = useGame.getState().consumables.map((c) => c.card.id);
    expect(ids.includes("the-high-priestess")).toBe(false);
  });

  test("every added consumable is a planet (kind: planet)", () => {
    useGame.getState().setConsumables([highPriestessConsumable()]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    const added = useGame.getState().consumables;
    expect(added.every((c) => c.kind === "planet")).toBe(true);
  });

  test("hidden planets (Planet X / Ceres / Eris) are excluded when their gating hand hasn't been played", () => {
    const hiddenIds = new Set(["planet-x", "ceres", "eris"]);
    for (let i = 0; i < 30; i += 1) {
      useGame.getState().setConsumables([highPriestessConsumable()]);
      const { result, unmount } = renderHook(() => useConsumableActions());
      act(() => result.current.useConsumable(0));
      unmount();
      const added = useGame.getState().consumables;
      const anyHidden = added.some(
        (c) => c.kind === "planet" && hiddenIds.has(c.card.id),
      );
      expect(anyHidden).toBe(false);
    }
  });

  test("hidden planets (Five of a Kind etc.) become eligible once their hand has been played", () => {
    useGame.getState().setHandPlayCounts((prev) => ({
      ...prev,
      "Five of a Kind": 1,
      "Flush House": 1,
      "Flush Five": 1,
    }));
    const eligibleHiddenIds = new Set(["planet-x", "ceres", "eris"]);
    let sawAtLeastOneHidden = false;
    for (let i = 0; i < 80 && !sawAtLeastOneHidden; i += 1) {
      useGame.getState().setConsumables([highPriestessConsumable()]);
      const { result, unmount } = renderHook(() => useConsumableActions());
      act(() => result.current.useConsumable(0));
      unmount();
      const added = useGame.getState().consumables;
      if (
        added.some(
          (c) => c.kind === "planet" && eligibleHiddenIds.has(c.card.id),
        )
      ) {
        sawAtLeastOneHidden = true;
      }
    }
    expect(sawAtLeastOneHidden).toBe(true);
  });

  test("negative: using The Hanged Man does not add any planet to the tray", () => {
    const card: Card = { id: 1, rank: "A", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    useGame.getState().setConsumables([hangedManConsumable()]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    const anyPlanet = useGame
      .getState()
      .consumables.some((c) => c.kind === "planet");
    expect(anyPlanet).toBe(false);
  });

  describe("with 3 consumable slots (Crystal Ball voucher)", () => {
    beforeEach(() => {
      useGame.getState().setOwnedVoucherIds(new Set(["crystal-ball"]));
    });

    test("with 0 other consumables, adds 2 planets", () => {
      useGame.getState().setConsumables([highPriestessConsumable()]);
      const { result } = renderHook(() => useConsumableActions());
      act(() => result.current.useConsumable(0));
      expect(useGame.getState().consumables).toHaveLength(2);
    });

    test("with 1 other consumable, adds 2 planets (fills the 2 free slots)", () => {
      useGame
        .getState()
        .setConsumables([highPriestessConsumable(), hangedManConsumable()]);
      const { result } = renderHook(() => useConsumableActions());
      act(() => result.current.useConsumable(0));
      expect(useGame.getState().consumables).toHaveLength(3);
    });

    test("with 2 other consumables, adds 1 planet (only 1 free slot after High Priestess consumed)", () => {
      useGame
        .getState()
        .setConsumables([
          highPriestessConsumable(),
          hangedManConsumable(),
          strengthConsumable(),
        ]);
      const { result } = renderHook(() => useConsumableActions());
      act(() => result.current.useConsumable(0));
      expect(useGame.getState().consumables).toHaveLength(3);
    });
  });
});

describe("useConsumableActions — The Fool", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("after using a tarot, The Fool adds a copy of that tarot to the tray", () => {
    const hermit = hermitConsumable();
    useGame.getState().setConsumables([hermit, foolConsumable()]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toEqual([hermit]);
  });

  test("after using a planet, The Fool adds a copy of that planet to the tray", () => {
    const pluto = plutoConsumable();
    useGame.getState().setConsumables([pluto, foolConsumable()]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toEqual([pluto]);
  });

  test("The Fool with no previously-used consumable is a no-op (consumes the fool)", () => {
    useGame.getState().setConsumables([foolConsumable()]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toHaveLength(0);
  });

  test("The Fool when consumable slots are full is a no-op (consumes the fool, adds nothing)", () => {
    const hermit = hermitConsumable();
    useGame.getState().setConsumables([hermit]);
    const { result: result1, unmount: unmount1 } = renderHook(() =>
      useConsumableActions(),
    );
    act(() => result1.current.useConsumable(0));
    unmount1();
    useGame
      .getState()
      .setConsumables([
        hangedManConsumable(),
        strengthConsumable(),
        foolConsumable(),
      ]);
    const { result: result2 } = renderHook(() => useConsumableActions());
    act(() => result2.current.useConsumable(2));
    expect(useGame.getState().consumables).toHaveLength(2);
  });

  test("The Fool used after The Fool does NOT copy The Fool (self-copy guard)", () => {
    useGame.getState().setConsumables([foolConsumable(), foolConsumable()]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toHaveLength(0);
  });

  test("The Fool is consumed regardless (even when no previously-used consumable exists)", () => {
    useGame.getState().setConsumables([foolConsumable(), hangedManConsumable()]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    const ids = useGame.getState().consumables.map((c) => c.card.id);
    expect(ids.includes("the-fool")).toBe(false);
  });
});

function setPackPreview(cards: ReadonlyArray<Card>, selectedIds: ReadonlyArray<number>): void {
  useGame.getState().setOpenedPack({
    pool: "arcana",
    variant: "normal",
    options: [],
  });
  useGame.getState().setPackPreviewHand([...cards]);
  useGame.getState().setPackPreviewSelectedIds(new Set(selectedIds));
}

describe("useConsumableActions — The Hanged Man on pack preview", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
    useGame.getState().setConsumables([hangedManConsumable()]);
  });

  test("destroys selected preview cards from packPreviewHand", () => {
    const cards: ReadonlyArray<Card> = [
      { id: 1, rank: "9", suit: "diamonds" },
      { id: 2, rank: "8", suit: "hearts" },
      { id: 3, rank: "7", suit: "clubs" },
    ];
    setPackPreview(cards, [1, 2]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().packPreviewHand.map((c) => c.id)).toEqual([3]);
  });

  test("adds destroyed ids to destroyedCardIds (deck persistence)", () => {
    const cards: ReadonlyArray<Card> = [{ id: 1, rank: "9", suit: "diamonds" }];
    setPackPreview(cards, [1]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().destroyedCardIds.has(1)).toBe(true);
  });

  test("consumes the tarot from the tray", () => {
    const cards: ReadonlyArray<Card> = [{ id: 1, rank: "9", suit: "diamonds" }];
    setPackPreview(cards, [1]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toHaveLength(0);
  });

  test("does not dismiss the pack modal (openedPack persists)", () => {
    const cards: ReadonlyArray<Card> = [{ id: 1, rank: "9", suit: "diamonds" }];
    setPackPreview(cards, [1]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().openedPack).not.toBeNull();
  });

  test("with 0 preview selection is a no-op and the tarot stays (negative)", () => {
    const cards: ReadonlyArray<Card> = [{ id: 1, rank: "9", suit: "diamonds" }];
    setPackPreview(cards, []);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toHaveLength(1);
  });
});

describe("useConsumableActions — Strength on pack preview", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
    useGame.getState().setConsumables([strengthConsumable()]);
  });

  test("rank-ups the selected preview card", () => {
    const cards: ReadonlyArray<Card> = [{ id: 5, rank: "8", suit: "hearts" }];
    setPackPreview(cards, [5]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    const newCard = useGame.getState().packPreviewHand[0];
    expect(newCard?.rank).toBe("9");
  });

  test("consumes the tarot from the tray", () => {
    const cards: ReadonlyArray<Card> = [{ id: 5, rank: "8", suit: "hearts" }];
    setPackPreview(cards, [5]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toHaveLength(0);
  });
});

function cryptidConsumable(): Consumable {
  const spec = createSpectralCatalog().find((s) => s.id === "cryptid");
  if (!spec) throw new Error("Cryptid missing from catalog");
  return { kind: "spectral", card: spec };
}

describe("useConsumableActions — Cryptid on pack preview", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
    useGame.getState().setConsumables([cryptidConsumable()]);
  });

  test("duplicates the selected preview card", () => {
    const cards: ReadonlyArray<Card> = [{ id: 7, rank: "K", suit: "spades" }];
    setPackPreview(cards, [7]);
    const { result } = renderHook(() => useConsumableActions());
    const before = useGame.getState().packPreviewHand.length;
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().packPreviewHand.length).toBeGreaterThan(before);
  });

  test("consumes the spectral from the tray", () => {
    const cards: ReadonlyArray<Card> = [{ id: 7, rank: "K", suit: "spades" }];
    setPackPreview(cards, [7]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toHaveLength(0);
  });
});

function auraConsumable(): Consumable {
  const spec = createSpectralCatalog().find((s) => s.id === "aura");
  if (!spec) throw new Error("Aura missing from catalog");
  return { kind: "spectral", card: spec };
}

describe("useConsumableActions — Aura on pack preview", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
    useGame.getState().setConsumables([auraConsumable()]);
  });

  test("applies an edition to the selected preview card", () => {
    const cards: ReadonlyArray<Card> = [{ id: 9, rank: "A", suit: "diamonds" }];
    setPackPreview(cards, [9]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().packPreviewHand[0]?.edition).toBeDefined();
  });

  test("consumes the spectral from the tray", () => {
    const cards: ReadonlyArray<Card> = [{ id: 9, rank: "A", suit: "diamonds" }];
    setPackPreview(cards, [9]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().consumables).toHaveLength(0);
  });
});

describe("useConsumableActions — Aura edition persists for the run", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
    useGame.getState().setConsumables([auraConsumable()]);
  });

  test("applying Aura in-round records the edition in cardEditionsById", () => {
    const card: Card = { id: 1, rank: "A", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    const st = useGame.getState();
    expect(st.cardEditionsById.get(card.id)).toBe(st.dealt.hand[0]?.edition);
    expect(st.cardEditionsById.get(card.id)).toBeDefined();
  });

  test("the in-hand card shows the edition immediately", () => {
    const card: Card = { id: 1, rank: "A", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().dealt.hand[0]?.edition).toBeDefined();
  });

  test("with no card selected, cardEditionsById stays empty (negative)", () => {
    const card: Card = { id: 1, rank: "A", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set());
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().cardEditionsById.size).toBe(0);
  });

  test("applying Aura to a pack-preview card records the edition in cardEditionsById", () => {
    const cards: ReadonlyArray<Card> = [{ id: 9, rank: "A", suit: "diamonds" }];
    setPackPreview(cards, [9]);
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    const st = useGame.getState();
    expect(st.cardEditionsById.get(9)).toBe(st.packPreviewHand[0]?.edition);
    expect(st.cardEditionsById.get(9)).toBeDefined();
  });
});

function catalogSpectralConsumable(id: string): Consumable {
  const card = createSpectralCatalog().find((s) => s.id === id);
  if (!card) throw new Error(`${id} missing from catalog`);
  return { kind: "spectral", card };
}

function magicianConsumable(): Consumable {
  const tarot = createTarotCatalog().find((t) => t.id === "the-magician");
  if (!tarot) throw new Error("The Magician missing from catalog");
  return { kind: "tarot", card: tarot };
}

describe("useConsumableActions — Talisman seal persists for the run", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
    useGame.getState().setConsumables([catalogSpectralConsumable("talisman")]);
  });

  test("applying a seal in-round records it in cardSealsById", () => {
    const card: Card = { id: 1, rank: "A", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().cardSealsById.get(card.id)).toBe("gold");
  });

  test("the in-hand card shows the seal immediately", () => {
    const card: Card = { id: 1, rank: "A", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().dealt.hand[0]?.seal).toBe("gold");
  });

  test("with no card selected, cardSealsById stays empty (negative)", () => {
    const card: Card = { id: 1, rank: "A", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set());
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().cardSealsById.size).toBe(0);
  });
});

describe("useConsumableActions — Cryptid copies persist for the run", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
    useGame.getState().setConsumables([catalogSpectralConsumable("cryptid")]);
  });

  test("copies are appended to the dealt hand", () => {
    const card: Card = { id: 1, rank: "K", suit: "hearts" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().dealt.hand).toHaveLength(1 + CRYPTID_COPY_COUNT);
  });

  test("copies are registered in addedCards", () => {
    const card: Card = { id: 1, rank: "K", suit: "hearts" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().addedCards).toHaveLength(CRYPTID_COPY_COUNT);
  });

  test("registered copies preserve the original rank and suit", () => {
    const card: Card = { id: 1, rank: "K", suit: "hearts" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    const added = useGame.getState().addedCards;
    expect(added.every((c) => c.rank === "K" && c.suit === "hearts")).toBe(true);
  });

  test("with more than 1 card selected, addedCards stays empty (negative)", () => {
    const a: Card = { id: 1, rank: "K", suit: "hearts" };
    const b: Card = { id: 2, rank: "Q", suit: "spades" };
    seedHand([a, b]);
    useGame.getState().setSelectedIds(new Set([a.id, b.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().addedCards).toHaveLength(0);
  });
});

describe("useConsumableActions — The Magician enhancement persists for the run", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
    useGame.getState().setConsumables([magicianConsumable()]);
  });

  test("applying an enhancement in-round records it in cardEnhancementsById", () => {
    const card: Card = { id: 1, rank: "A", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().cardEnhancementsById.get(card.id)).toBe("lucky");
  });

  test("the in-hand card shows the enhancement immediately", () => {
    const card: Card = { id: 1, rank: "A", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().dealt.hand[0]?.enhancement).toBe("lucky");
  });

  test("with no card selected, cardEnhancementsById stays empty (negative)", () => {
    const card: Card = { id: 1, rank: "A", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set());
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(useGame.getState().cardEnhancementsById.size).toBe(0);
  });
});

describe("useConsumableActions — decision recording", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useGame.getState().resetGame();
    useGame.getState().setConsumables([hangedManConsumable()]);
  });

  test("using a consumable records a consumable-use event", () => {
    const card: Card = { id: 1, rank: "A", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(humanPlayLog().counts()).toEqual({ "consumable-use": 1 });
  });

  test("the record carries the target card ids", () => {
    const card: Card = { id: 1, rank: "A", suit: "spades" };
    seedHand([card]);
    useGame.getState().setSelectedIds(new Set([card.id]));
    const { result } = renderHook(() => useConsumableActions());
    act(() => result.current.useConsumable(0));
    expect(humanPlayLog().toJsonl()).toContain('"targetCardIds":[1]');
  });
});
