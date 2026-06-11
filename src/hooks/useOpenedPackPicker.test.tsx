import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import { useOpenedPackPicker } from "./useOpenedPackPicker";
import { useGame } from "../store/game";
import { humanPlayLog } from "../ai/humanPlayWiring";
import { createPlanetCatalog } from "../items/planets";
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

describe("pickFromOpenedPack — unhandled tarot effect kinds (fix)", () => {
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

  describe("The High Priestess (create-consumables) fires on pick", () => {
    test("picking The High Priestess adds 2 planet consumables to the tray", () => {
      openPack([tarotOption("the-high-priestess")]);
      const { result } = renderHook(() => useOpenedPackPicker());
      act(() => result.current.pickFromOpenedPack(0));
      expect(useGame.getState().consumables).toHaveLength(2);
    });

    test("picking The High Priestess adds planets (not the tarot itself)", () => {
      openPack([tarotOption("the-high-priestess")]);
      const { result } = renderHook(() => useOpenedPackPicker());
      act(() => result.current.pickFromOpenedPack(0));
      const kinds = useGame.getState().consumables.map((c) => c.kind);
      expect(kinds.every((k) => k === "planet")).toBe(true);
    });

    test("picking The High Priestess decrements packPicksRemaining", () => {
      openPack([tarotOption("the-high-priestess")], [], 2);
      const { result } = renderHook(() => useOpenedPackPicker());
      act(() => result.current.pickFromOpenedPack(0));
      expect(useGame.getState().packPicksRemaining).toBe(1);
    });

    test("full tray does NOT decrement packPicksRemaining (negative)", () => {
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

describe("pickFromOpenedPack — Judgement (create-joker) fires immediately (fix)", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("picking Judgement from an Arcana pack adds a joker to the equipped row", () => {
    openPack([tarotOption("judgement")]);
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    expect(useGame.getState().jokers).toHaveLength(1);
  });

  test("picking Judgement decrements packPicksRemaining", () => {
    openPack([tarotOption("judgement")], [], 2);
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    expect(useGame.getState().packPicksRemaining).toBe(1);
  });

  test("picking Judgement does NOT add the tarot to the consumable tray (negative)", () => {
    openPack([tarotOption("judgement")]);
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    expect(useGame.getState().consumables).toHaveLength(0);
  });

  test("Judgement at MAX_JOKERS capacity does NOT decrement packPicksRemaining (negative)", () => {
    const catalog = createJokerCatalog();
    useGame.getState().setJokers(catalog.slice(0, 5));
    openPack([tarotOption("judgement")], [], 2);
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    expect(useGame.getState().packPicksRemaining).toBe(2);
  });

  test("Judgement at MAX_JOKERS capacity does NOT add a joker (negative)", () => {
    const catalog = createJokerCatalog();
    useGame.getState().setJokers(catalog.slice(0, 5));
    openPack([tarotOption("judgement")]);
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    expect(useGame.getState().jokers).toHaveLength(5);
  });
});

describe("pickFromOpenedPack — The Emperor (create-consumables) fires on pick", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("picking The Emperor adds 2 tarot consumables to the tray", () => {
    openPack([tarotOption("the-emperor")]);
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    expect(useGame.getState().consumables).toHaveLength(2);
  });

  test("The Emperor never creates another Emperor (negative)", () => {
    openPack([tarotOption("the-emperor")]);
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    const ids = useGame.getState().consumables.map((c) => c.card.id);
    expect(ids.includes("the-emperor")).toBe(false);
  });

  test("picking The Emperor adds tarot consumables (not planet)", () => {
    openPack([tarotOption("the-emperor")]);
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    const kinds = useGame.getState().consumables.map((c) => c.kind);
    expect(kinds.every((k) => k === "tarot")).toBe(true);
  });

  test("picking The Emperor decrements packPicksRemaining", () => {
    openPack([tarotOption("the-emperor")], [], 2);
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    expect(useGame.getState().packPicksRemaining).toBe(1);
  });
});

describe("pickFromOpenedPack — Death (death-copy) fires on preview pack", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("with 2 preview cards selected, Death copies the left onto the right", () => {
    const left: Card = { id: 100, rank: "K", suit: "spades" };
    const right: Card = { id: 101, rank: "5", suit: "hearts" };
    openPack([tarotOption("death")], [left, right], 2);
    useGame.getState().setPackPreviewSelectedIds(new Set([left.id, right.id]));
    useGame.getState().setPackPreviewDisplayOrder([left.id, right.id]);
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    const updated = useGame.getState().packPreviewHand.find((c) => c.id === left.id);
    expect(updated?.rank).toBe(right.rank);
  });

  test("decrements packPicksRemaining when fired against a preview", () => {
    const left: Card = { id: 200, rank: "K", suit: "spades" };
    const right: Card = { id: 201, rank: "5", suit: "hearts" };
    openPack([tarotOption("death")], [left, right], 2);
    useGame.getState().setPackPreviewSelectedIds(new Set([left.id, right.id]));
    useGame.getState().setPackPreviewDisplayOrder([left.id, right.id]);
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    expect(useGame.getState().packPicksRemaining).toBe(1);
  });

  test("with only 1 preview card selected, Death is a no-op (negative)", () => {
    const left: Card = { id: 300, rank: "K", suit: "spades" };
    const right: Card = { id: 301, rank: "5", suit: "hearts" };
    openPack([tarotOption("death")], [left, right], 2);
    useGame.getState().setPackPreviewSelectedIds(new Set([left.id]));
    useGame.getState().setPackPreviewDisplayOrder([left.id, right.id]);
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    expect(useGame.getState().packPicksRemaining).toBe(2);
  });
});

describe("pickFromOpenedPack — convert-suit fires on preview pack", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("The Sun converts a selected preview card to hearts", () => {
    const c: Card = { id: 400, rank: "K", suit: "spades" };
    openPack([tarotOption("the-sun")], [c], 2);
    useGame.getState().setPackPreviewSelectedIds(new Set([c.id]));
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    expect(useGame.getState().packPreviewHand[0]?.suit).toBe("hearts");
  });

  test("The Star converts a selected preview card to diamonds", () => {
    const c: Card = { id: 410, rank: "K", suit: "spades" };
    openPack([tarotOption("the-star")], [c], 2);
    useGame.getState().setPackPreviewSelectedIds(new Set([c.id]));
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    expect(useGame.getState().packPreviewHand[0]?.suit).toBe("diamonds");
  });

  test("with 0 preview cards selected, convert-suit is a no-op (negative)", () => {
    const c: Card = { id: 420, rank: "K", suit: "spades" };
    openPack([tarotOption("the-sun")], [c], 2);
    useGame.getState().setPackPreviewSelectedIds(new Set());
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    expect(useGame.getState().packPicksRemaining).toBe(2);
  });
});

describe("pickFromOpenedPack — The Fool (copy-last-consumable) fires on pick", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("with a previously-used tarot, picking The Fool adds a copy to the tray", () => {
    const hangedMan = createTarotCatalog().find((t) => t.id === "the-hanged-man");
    if (!hangedMan) throw new Error("missing");
    useGame.getState().setLastUsedConsumable({ kind: "tarot", card: hangedMan });
    openPack([tarotOption("the-fool")]);
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    const ids = useGame.getState().consumables.map((c) => c.card.id);
    expect(ids).toEqual(["the-hanged-man"]);
  });

  test("with no lastUsedConsumable, The Fool is a no-op (negative)", () => {
    useGame.getState().setLastUsedConsumable(null);
    openPack([tarotOption("the-fool")], [], 2);
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    expect(useGame.getState().packPicksRemaining).toBe(2);
  });

  test("The Fool never copies itself (negative)", () => {
    const fool = createTarotCatalog().find((t) => t.id === "the-fool");
    if (!fool) throw new Error("missing");
    useGame.getState().setLastUsedConsumable({ kind: "tarot", card: fool });
    openPack([tarotOption("the-fool")], [], 2);
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    expect(useGame.getState().packPicksRemaining).toBe(2);
  });
});

describe("pickFromOpenedPack — decision recording", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useGame.getState().resetGame();
  });

  test("a successful pick records a pack-pick event", () => {
    const planet = createPlanetCatalog()[0];
    openPack([{ kind: "planet", planet }]);
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    expect(humanPlayLog().counts()).toEqual({ "pack-pick": 1 });
  });

  test("the pick record carries the chosen index", () => {
    const planet = createPlanetCatalog()[0];
    openPack([{ kind: "planet", planet }]);
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    expect(humanPlayLog().toJsonl()).toContain('"pickedIndex":0');
  });

  test("a rejected pick records nothing", () => {
    const planet = createPlanetCatalog()[0];
    openPack([{ kind: "planet", planet }], [], 0);
    const { result } = renderHook(() => useOpenedPackPicker());
    act(() => result.current.pickFromOpenedPack(0));
    expect(humanPlayLog().count()).toBe(0);
  });
});
