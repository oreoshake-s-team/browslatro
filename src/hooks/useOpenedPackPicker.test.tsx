import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import { useOpenedPackPicker } from "./useOpenedPackPicker";
import { useGame } from "../store/game";
import { createTarotCatalog, HERMIT_MONEY_CAP } from "../items/tarots";
import { createJokerCatalog, withEdition } from "../items/jokers";
import type { PackOffer, PackOption } from "../items/packs";
import type { TarotCard } from "../items/tarots";
import type { Card } from "../cards/types";

function findTarot(id: string): TarotCard {
  const tarot = createTarotCatalog().find((t) => t.id === id);
  if (!tarot) throw new Error(`${id} missing from catalog`);
  return tarot;
}

function tarotOption(id: string): PackOption {
  return { kind: "tarot", tarot: findTarot(id) };
}

function arcanaPack(options: ReadonlyArray<PackOption>): PackOffer {
  return { pool: "arcana", variant: "normal", options };
}

function openPack(
  options: ReadonlyArray<PackOption>,
  previewHand: ReadonlyArray<Card> = [],
  picksRemaining: number = 1,
): void {
  useGame.getState().setOpenedPack(arcanaPack(options));
  useGame.getState().setPackPicksRemaining(picksRemaining);
  useGame.getState().setPackPreviewHand([...previewHand]);
}

function fillConsumableTrayWithHangedMen(count: number): void {
  const filler = Array.from({ length: count }, () => ({
    kind: "tarot" as const,
    card: findTarot("the-hanged-man"),
  }));
  useGame.getState().setConsumables(filler);
}

describe("pickFromOpenedPack — unhandled tarot effect kinds (fix #822)", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  describe("The Hanged Man (destroy-selected)", () => {
    test("non-preview pack with free slot adds The Hanged Man to the tray", () => {
      openPack([tarotOption("the-hanged-man")]);
      const { result } = renderHook(() => useOpenedPackPicker());
      act(() => result.current.pickFromOpenedPack(0));
      const ids = useGame.getState().consumables.map((c) => c.card.id);
      expect(ids).toEqual(["the-hanged-man"]);
    });

    test("non-preview pack with free slot decrements packPicksRemaining", () => {
      openPack([tarotOption("the-hanged-man")], [], 2);
      const { result } = renderHook(() => useOpenedPackPicker());
      act(() => result.current.pickFromOpenedPack(0));
      expect(useGame.getState().packPicksRemaining).toBe(1);
    });

    test("full tray does NOT decrement packPicksRemaining (early return)", () => {
      fillConsumableTrayWithHangedMen(2);
      openPack([tarotOption("the-hanged-man")], [], 2);
      const { result } = renderHook(() => useOpenedPackPicker());
      act(() => result.current.pickFromOpenedPack(0));
      expect(useGame.getState().packPicksRemaining).toBe(2);
    });

    test("full tray does NOT add another consumable (negative)", () => {
      fillConsumableTrayWithHangedMen(2);
      openPack([tarotOption("the-hanged-man")]);
      const { result } = renderHook(() => useOpenedPackPicker());
      act(() => result.current.pickFromOpenedPack(0));
      expect(useGame.getState().consumables).toHaveLength(2);
    });

    test("preview-mode pack does NOT decrement packPicksRemaining (early return)", () => {
      const previewCard: Card = { id: 1, rank: "A", suit: "spades" };
      openPack([tarotOption("the-hanged-man")], [previewCard], 2);
      const { result } = renderHook(() => useOpenedPackPicker());
      act(() => result.current.pickFromOpenedPack(0));
      expect(useGame.getState().packPicksRemaining).toBe(2);
    });

    test("preview-mode pack does NOT add the tarot to the tray (negative)", () => {
      const previewCard: Card = { id: 1, rank: "A", suit: "spades" };
      openPack([tarotOption("the-hanged-man")], [previewCard]);
      const { result } = renderHook(() => useOpenedPackPicker());
      act(() => result.current.pickFromOpenedPack(0));
      expect(useGame.getState().consumables).toHaveLength(0);
    });
  });

  describe("Death (death-copy)", () => {
    test("non-preview pack with free slot adds Death to the tray", () => {
      openPack([tarotOption("death")]);
      const { result } = renderHook(() => useOpenedPackPicker());
      act(() => result.current.pickFromOpenedPack(0));
      const ids = useGame.getState().consumables.map((c) => c.card.id);
      expect(ids).toEqual(["death"]);
    });

    test("full tray does NOT decrement packPicksRemaining (early return)", () => {
      fillConsumableTrayWithHangedMen(2);
      openPack([tarotOption("death")], [], 2);
      const { result } = renderHook(() => useOpenedPackPicker());
      act(() => result.current.pickFromOpenedPack(0));
      expect(useGame.getState().packPicksRemaining).toBe(2);
    });
  });

  describe("Strength (rank-up-selected)", () => {
    test("non-preview pack with free slot adds Strength to the tray", () => {
      openPack([tarotOption("strength")]);
      const { result } = renderHook(() => useOpenedPackPicker());
      act(() => result.current.pickFromOpenedPack(0));
      const ids = useGame.getState().consumables.map((c) => c.card.id);
      expect(ids).toEqual(["strength"]);
    });

    test("full tray does NOT decrement packPicksRemaining (early return)", () => {
      fillConsumableTrayWithHangedMen(2);
      openPack([tarotOption("strength")], [], 2);
      const { result } = renderHook(() => useOpenedPackPicker());
      act(() => result.current.pickFromOpenedPack(0));
      expect(useGame.getState().packPicksRemaining).toBe(2);
    });
  });

  describe("The High Priestess (create-consumables)", () => {
    test("non-preview pack with free slot adds The High Priestess to the tray", () => {
      openPack([tarotOption("the-high-priestess")]);
      const { result } = renderHook(() => useOpenedPackPicker());
      act(() => result.current.pickFromOpenedPack(0));
      const ids = useGame.getState().consumables.map((c) => c.card.id);
      expect(ids).toEqual(["the-high-priestess"]);
    });

    test("full tray does NOT decrement packPicksRemaining (early return)", () => {
      fillConsumableTrayWithHangedMen(2);
      openPack([tarotOption("the-high-priestess")], [], 2);
      const { result } = renderHook(() => useOpenedPackPicker());
      act(() => result.current.pickFromOpenedPack(0));
      expect(useGame.getState().packPicksRemaining).toBe(2);
    });
  });

  describe("with Crystal Ball voucher (3-slot capacity)", () => {
    test("Hanged Man fills the third slot when two are taken", () => {
      useGame.getState().setOwnedVoucherIds(new Set(["crystal-ball"]));
      fillConsumableTrayWithHangedMen(2);
      openPack([tarotOption("the-hanged-man")]);
      const { result } = renderHook(() => useOpenedPackPicker());
      act(() => result.current.pickFromOpenedPack(0));
      expect(useGame.getState().consumables).toHaveLength(3);
    });

    test("Hanged Man does NOT add when all 3 slots are full", () => {
      useGame.getState().setOwnedVoucherIds(new Set(["crystal-ball"]));
      fillConsumableTrayWithHangedMen(3);
      openPack([tarotOption("the-hanged-man")], [], 2);
      const { result } = renderHook(() => useOpenedPackPicker());
      act(() => result.current.pickFromOpenedPack(0));
      expect(useGame.getState().packPicksRemaining).toBe(2);
    });
  });
});

describe("pickFromOpenedPack — existing handled effect-kind regressions", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("apply-enhancement (The Magician) with free slot still adds to tray in non-preview", () => {
    openPack([tarotOption("the-magician")]);
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    const ids = useGame.getState().consumables.map((c) => c.card.id);
    expect(ids).toEqual(["the-magician"]);
  });

  test("apply-enhancement (The Magician) with full tray does NOT decrement", () => {
    fillConsumableTrayWithHangedMen(2);
    openPack([tarotOption("the-magician")], [], 2);
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    expect(useGame.getState().packPicksRemaining).toBe(2);
  });

  test("money-multiply (The Hermit) still pays out instantly", () => {
    useGame.getState().setMoney(5);
    openPack([tarotOption("the-hermit")]);
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    expect(useGame.getState().money).toBe(5 + Math.min(5, HERMIT_MONEY_CAP));
  });

  test("edition-roll (Wheel of Fortune) still consumes the pick", () => {
    const catalog = createJokerCatalog();
    useGame.getState().setJokers([catalog[0]]);
    openPack([tarotOption("wheel-of-fortune")], [], 2);
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    expect(useGame.getState().packPicksRemaining).toBe(1);
  });

  test("apply-enhancement on preview-mode pack with NO selection does NOT decrement (negative)", () => {
    const previewCard: Card = { id: 1, rank: "A", suit: "spades" };
    openPack([tarotOption("the-magician")], [previewCard], 2);
    useGame.getState().setPackPreviewSelectedIds(new Set());
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    expect(useGame.getState().packPicksRemaining).toBe(2);
  });

  test("joker pick at capacity does NOT decrement (negative regression)", () => {
    const catalog = createJokerCatalog();
    useGame.getState().setJokers(catalog.slice(0, 5));
    const joker = withEdition(catalog[6], "foil");
    openPack([{ kind: "joker", joker }], [], 2);
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    expect(useGame.getState().packPicksRemaining).toBe(2);
  });
});
