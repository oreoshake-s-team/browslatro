import {
  CRYPTID_COPY_COUNT,
  FAMILIAR_ADD_COUNT,
  GRIM_ADD_COUNT,
  INCANTATION_ADD_COUNT,
  IMMOLATE_DESTROY_COUNT,
  IMMOLATE_MONEY_GAIN,
  SPECTRAL_BASE_PRICE,
  createSpectralCatalog,
  duplicateSelectedInHand,
  makeEnhancedCard,
  spectralNeedsTarget,
  transmuteHand,
  type SpectralCard,
} from "./spectrals";
import { nextCardId, resetCardIds } from "../cards/deck";
import type { Card } from "../cards/types";

function find(id: SpectralCard["id"]): SpectralCard {
  const card = createSpectralCatalog().find((c) => c.id === id);
  if (!card) throw new Error(`missing spectral fixture: ${id}`);
  return card;
}

describe("createSpectralCatalog", () => {
  test("returns at least 3 spectral cards", () => {
    expect(createSpectralCatalog().length).toBeGreaterThanOrEqual(3);
  });

  test("every card has a unique id", () => {
    const ids = createSpectralCatalog().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every card has a non-empty name", () => {
    expect(createSpectralCatalog().every((c) => c.name.length > 0)).toBe(true);
  });

  test("every card has a non-empty description", () => {
    expect(createSpectralCatalog().every((c) => c.description.length > 0)).toBe(
      true,
    );
  });

  test.each<{ id: string; name: string }>([
    { id: "black-hole", name: "Black Hole" },
    { id: "immolate", name: "Immolate" },
    { id: "sigil", name: "Sigil" },
    { id: "talisman", name: "Talisman" },
    { id: "deja-vu", name: "Deja Vu" },
    { id: "trance", name: "Trance" },
    { id: "medium", name: "Medium" },
    { id: "familiar", name: "Familiar" },
    { id: "grim", name: "Grim" },
    { id: "incantation", name: "Incantation" },
    { id: "cryptid", name: "Cryptid" },
    { id: "ectoplasm", name: "Ectoplasm" },
    { id: "ouija", name: "Ouija" },
    { id: "hex", name: "Hex" },
    { id: "ankh", name: "Ankh" },
    { id: "soul", name: "The Soul" },
  ])("includes $name", ({ id, name }) => {
    expect(find(id).name).toBe(name);
  });

  test("spans 12 distinct effect kinds", () => {
    const kinds = new Set(createSpectralCatalog().map((c) => c.effect.kind));
    expect(kinds.size).toBe(12);
  });
});

describe("Seal-applying spectrals", () => {
  const SEAL_BY_ID: Record<string, "gold" | "red" | "blue" | "purple"> = {
    talisman: "gold",
    "deja-vu": "red",
    trance: "blue",
    medium: "purple",
  };

  test.each(Object.entries(SEAL_BY_ID))(
    "%s targets seal %s",
    (id, seal) => {
      const card = find(id);
      if (card.effect.kind !== "apply-seal") {
        throw new Error(`${id} should be an apply-seal spectral`);
      }
      expect(card.effect.seal).toBe(seal);
    },
  );

  test.each(Object.keys(SEAL_BY_ID))(
    "%s has maxTargets 1",
    (id) => {
      const card = find(id);
      if (card.effect.kind !== "apply-seal") {
        throw new Error(`${id} should be an apply-seal spectral`);
      }
      expect(card.effect.maxTargets).toBe(1);
    },
  );

  test.each<{ id: string; sealLabel: "Gold" | "Red" | "Blue" | "Purple" }>([
    { id: "talisman", sealLabel: "Gold" },
    { id: "deja-vu", sealLabel: "Red" },
    { id: "trance", sealLabel: "Blue" },
    { id: "medium", sealLabel: "Purple" },
  ])("$id description names the $sealLabel Seal", ({ id, sealLabel }) => {
    expect(find(id).description).toMatch(new RegExp(`${sealLabel} Seal`));
  });
});

describe("Spectral descriptions", () => {
  test("Black Hole description mentions upgrading every poker hand", () => {
    expect(find("black-hole").description).toMatch(/every poker hand/i);
  });

  test("Immolate description names the destroy count", () => {
    expect(find("immolate").description).toContain(
      String(IMMOLATE_DESTROY_COUNT),
    );
  });

  test("Immolate description names the money gain", () => {
    expect(find("immolate").description).toContain(
      `$${IMMOLATE_MONEY_GAIN}`,
    );
  });

  test("Sigil description mentions a single random suit", () => {
    expect(find("sigil").description).toMatch(/single random suit/i);
  });
});

describe("Immolate constants", () => {
  test("destroys 5 cards (Balatro authentic)", () => {
    expect(IMMOLATE_DESTROY_COUNT).toBe(5);
  });

  test("gains $20 (Balatro authentic)", () => {
    expect(IMMOLATE_MONEY_GAIN).toBe(20);
  });
});

function sequenceRng(values: ReadonlyArray<number>): () => number {
  let i = 0;
  return (): number => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

describe("makeEnhancedCard", () => {
  beforeEach(() => resetCardIds());

  test("produces a face card when filter is 'face'", () => {
    const card = makeEnhancedCard("face", sequenceRng([0]));
    expect(["J", "Q", "K"]).toContain(card.rank);
  });

  test("produces an Ace when filter is 'ace'", () => {
    const card = makeEnhancedCard("ace", sequenceRng([0]));
    expect(card.rank).toBe("A");
  });

  test("produces a numbered card when filter is 'numbered'", () => {
    const card = makeEnhancedCard("numbered", sequenceRng([0]));
    expect(["2","3","4","5","6","7","8","9","10"]).toContain(card.rank);
  });

  test("attaches an enhancement", () => {
    const card = makeEnhancedCard("face", sequenceRng([0]));
    expect(card.enhancement).toBeDefined();
  });
});

describe("transmuteHand", () => {
  beforeEach(() => resetCardIds());

  function fakeHand(count: number): ReadonlyArray<Card> {
    const cards: Card[] = [];
    for (let i = 0; i < count; i += 1) {
      cards.push({ id: nextCardId(), rank: "2", suit: "spades" });
    }
    return cards;
  }

  test("Familiar shape (face, 3): hand grows from 8 to 10", () => {
    const next = transmuteHand(
      fakeHand(8),
      "face",
      FAMILIAR_ADD_COUNT,
      sequenceRng([0]),
    );
    expect(next).toHaveLength(10);
  });

  test("Grim shape (ace, 2): hand grows from 8 to 9 (destroy 1 + add 2)", () => {
    const next = transmuteHand(
      fakeHand(8),
      "ace",
      GRIM_ADD_COUNT,
      sequenceRng([0]),
    );
    expect(next).toHaveLength(9);
  });

  test("Incantation shape (numbered, 4): hand grows from 8 to 11", () => {
    const next = transmuteHand(
      fakeHand(8),
      "numbered",
      INCANTATION_ADD_COUNT,
      sequenceRng([0]),
    );
    expect(next).toHaveLength(11);
  });

  test("the random card chosen to destroy is removed (rng=0 destroys index 0)", () => {
    const source = fakeHand(8);
    const firstId = source[0].id;
    const next = transmuteHand(
      source,
      "face",
      FAMILIAR_ADD_COUNT,
      sequenceRng([0]),
    );
    expect(next.some((c) => c.id === firstId)).toBe(false);
  });

  test("added cards have unique ids that aren't in the source hand (negative)", () => {
    const source = fakeHand(8);
    const sourceIds = new Set(source.map((c) => c.id));
    const next = transmuteHand(source, "face", FAMILIAR_ADD_COUNT, sequenceRng([0]));
    const additionIds = next.slice(-FAMILIAR_ADD_COUNT).map((c) => c.id);
    for (const id of additionIds) {
      expect(sourceIds.has(id)).toBe(false);
    }
  });

  test("on an empty hand, just adds the requested number of cards", () => {
    const next = transmuteHand([], "face", FAMILIAR_ADD_COUNT, sequenceRng([0]));
    expect(next).toHaveLength(FAMILIAR_ADD_COUNT);
  });
});

describe("Cryptid", () => {
  test("creates 2 copies (Balatro authentic)", () => {
    expect(CRYPTID_COPY_COUNT).toBe(2);
  });

  test("targets a single card", () => {
    const card = find("cryptid");
    if (card.effect.kind !== "duplicate-selected") {
      throw new Error("cryptid should be a duplicate-selected spectral");
    }
    expect(card.effect.maxTargets).toBe(1);
  });

  test("copies count matches CRYPTID_COPY_COUNT", () => {
    const card = find("cryptid");
    if (card.effect.kind !== "duplicate-selected") {
      throw new Error("cryptid should be a duplicate-selected spectral");
    }
    expect(card.effect.copies).toBe(CRYPTID_COPY_COUNT);
  });

  test("description names the copy count", () => {
    expect(find("cryptid").description).toContain(String(CRYPTID_COPY_COUNT));
  });

  test("is flagged as needing a target", () => {
    expect(spectralNeedsTarget(find("cryptid").effect)).toBe(true);
  });
});

describe("spectralNeedsTarget", () => {
  test("is true for an apply-seal spectral", () => {
    expect(spectralNeedsTarget(find("talisman").effect)).toBe(true);
  });

  test("is false for a non-targeted spectral", () => {
    expect(spectralNeedsTarget(find("sigil").effect)).toBe(false);
  });
});

describe("duplicateSelectedInHand", () => {
  beforeEach(() => resetCardIds());

  function fakeHand(count: number): ReadonlyArray<Card> {
    const cards: Card[] = [];
    for (let i = 0; i < count; i += 1) {
      cards.push({ id: nextCardId(), rank: "2", suit: "spades" });
    }
    return cards;
  }

  test("appends CRYPTID_COPY_COUNT cards when exactly 1 is selected", () => {
    const hand = fakeHand(3);
    const next = duplicateSelectedInHand(
      hand,
      new Set([hand[0].id]),
      CRYPTID_COPY_COUNT,
    );
    expect(next).toHaveLength(3 + CRYPTID_COPY_COUNT);
  });

  test("copies preserve rank, suit, enhancement, and seal", () => {
    resetCardIds();
    const original: Card = {
      id: nextCardId(),
      rank: "K",
      suit: "hearts",
      enhancement: "glass",
      seal: "gold",
    };
    const next = duplicateSelectedInHand([original], new Set([original.id]), 2);
    const copies = next.slice(1);
    expect(copies).toEqual([
      { id: copies[0].id, rank: "K", suit: "hearts", enhancement: "glass", seal: "gold" },
      { id: copies[1].id, rank: "K", suit: "hearts", enhancement: "glass", seal: "gold" },
    ]);
  });

  test("copies receive fresh ids not present in the source hand", () => {
    const hand = fakeHand(2);
    const sourceIds = new Set(hand.map((c) => c.id));
    const next = duplicateSelectedInHand(hand, new Set([hand[1].id]), 2);
    const copyIds = next.slice(2).map((c) => c.id);
    for (const id of copyIds) {
      expect(sourceIds.has(id)).toBe(false);
    }
  });

  test("is a no-op when no card is selected", () => {
    const hand = fakeHand(3);
    expect(duplicateSelectedInHand(hand, new Set(), 2)).toBe(hand);
  });

  test("is a no-op when more than 1 card is selected", () => {
    const hand = fakeHand(3);
    const next = duplicateSelectedInHand(
      hand,
      new Set([hand[0].id, hand[1].id]),
      2,
    );
    expect(next).toBe(hand);
  });
});

describe("SPECTRAL_BASE_PRICE", () => {
  test("is a positive number", () => {
    expect(SPECTRAL_BASE_PRICE).toBeGreaterThan(0);
  });

  test("is more expensive than a tarot card", () => {
    expect(SPECTRAL_BASE_PRICE).toBeGreaterThan(3);
  });
});

describe("Wraith", () => {
  test("appears in the spectral catalog", () => {
    expect(find("wraith").name).toBe("Wraith");
  });

  test("creates a Rare joker and zeroes money", () => {
    expect(find("wraith").effect).toEqual({
      kind: "create-joker-by-rarity",
      rarity: "rare",
      setMoneyToZero: true,
    });
  });

  test("describes itself as creating a random Rare Joker", () => {
    expect(find("wraith").description).toContain("Rare Joker");
  });

  test("describes itself as setting money to $0", () => {
    expect(find("wraith").description).toContain("set money to $0");
  });
});

describe("Ectoplasm", () => {
  test("is included in the catalog", () => {
    expect(find("ectoplasm").name).toBe("Ectoplasm");
  });

  test("carries a -1 hand-size delta", () => {
    const effect = find("ectoplasm").effect;
    if (effect.kind !== "ectoplasm") throw new Error("expected ectoplasm");
    expect(effect.handSizeDelta).toBe(-1);
  });

  test("describes adding Negative to a random Joker", () => {
    expect(find("ectoplasm").description).toContain("Negative");
  });

  test("does not need a selected target (negative)", () => {
    expect(spectralNeedsTarget(find("ectoplasm").effect)).toBe(false);
  });
});

describe("Ouija", () => {
  test("is included in the catalog", () => {
    expect(find("ouija").name).toBe("Ouija");
  });

  test("carries a -1 hand-size delta", () => {
    const effect = find("ouija").effect;
    if (effect.kind !== "ouija") throw new Error("expected ouija");
    expect(effect.handSizeDelta).toBe(-1);
  });

  test("describes converting the hand to a single random rank", () => {
    expect(find("ouija").description).toMatch(/single random rank/i);
  });

  test("does not need a selected target (negative)", () => {
    expect(spectralNeedsTarget(find("ouija").effect)).toBe(false);
  });
});

describe("The Soul", () => {
  test("is included in the catalog", () => {
    expect(find("soul").name).toBe("The Soul");
  });

  test("creates a Legendary joker", () => {
    expect(find("soul").effect.kind).toBe("create-legendary");
  });

  test("describes creating a Legendary Joker", () => {
    expect(find("soul").description).toContain("Legendary Joker");
  });

  test("does not need a selected target (negative)", () => {
    expect(spectralNeedsTarget(find("soul").effect)).toBe(false);
  });
});

describe("Hex", () => {
  test("is included in the catalog", () => {
    expect(find("hex").name).toBe("Hex");
  });

  test("carries the hex effect kind", () => {
    expect(find("hex").effect.kind).toBe("hex");
  });

  test("describes adding Polychrome to a random Joker", () => {
    expect(find("hex").description).toMatch(/Polychrome.*random Joker/i);
  });

  test("describes destroying all other Jokers", () => {
    expect(find("hex").description).toMatch(/destroy all other Jokers/i);
  });

  test("does not need a selected target (negative)", () => {
    expect(spectralNeedsTarget(find("hex").effect)).toBe(false);
  });
});

describe("Ankh", () => {
  test("is included in the catalog", () => {
    expect(find("ankh").name).toBe("Ankh");
  });

  test("carries the ankh effect kind", () => {
    expect(find("ankh").effect.kind).toBe("ankh");
  });

  test("describes creating a copy of a random Joker", () => {
    expect(find("ankh").description).toMatch(/copy of a random Joker/i);
  });

  test("describes destroying all other Jokers", () => {
    expect(find("ankh").description).toMatch(/destroy all other Jokers/i);
  });

  test("does not need a selected target (negative)", () => {
    expect(spectralNeedsTarget(find("ankh").effect)).toBe(false);
  });
});
