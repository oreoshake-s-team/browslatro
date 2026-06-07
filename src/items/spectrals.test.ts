import {
  CRYPTID_COPY_COUNT,
  FAMILIAR_ADD_COUNT,
  GRIM_ADD_COUNT,
  HIDDEN_SPECTRAL_REPLACE_CHANCE,
  INCANTATION_ADD_COUNT,
  IMMOLATE_DESTROY_COUNT,
  IMMOLATE_MONEY_GAIN,
  SPECTRAL_BASE_PRICE,
  applyAuraToSelectedInHand,
  createPoolSpectralCatalog,
  createSpectralCatalog,
  duplicateSelectedInHand,
  makeEnhancedCard,
  rollHiddenSpectralReplacement,
  spectralNeedsTarget,
  transmuteHand,
  type SpectralCard,
} from "./spectrals";
import { nextCardId, resetCardIds } from "../cards/deck";
import type { Card } from "../cards/types";
import { sequenceRng } from "../test/rng";

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
    { id: "aura", name: "Aura" },
    { id: "soul", name: "The Soul" },
  ])("includes $name", ({ id, name }) => {
    expect(find(id).name).toBe(name);
  });

  test("spans 13 distinct effect kinds", () => {
    const kinds = new Set(createSpectralCatalog().map((c) => c.effect.kind));
    expect(kinds.size).toBe(13);
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

describe("Aura", () => {
  test("carries the aura effect kind", () => {
    expect(find("aura").effect.kind).toBe("aura");
  });

  test("requires exactly 1 selected target", () => {
    const effect = find("aura").effect;
    if (effect.kind !== "aura") throw new Error("expected aura");
    expect(effect.maxTargets).toBe(1);
  });

  test("describes Foil, Holographic, or Polychrome", () => {
    expect(find("aura").description).toMatch(/Foil.*Holographic.*Polychrome/);
  });

  test("describes applying to 1 selected card in hand", () => {
    expect(find("aura").description).toMatch(/1 selected card.*hand/i);
  });

  test("needs a selected target", () => {
    expect(spectralNeedsTarget(find("aura").effect)).toBe(true);
  });
});

describe("applyAuraToSelectedInHand", () => {
  beforeEach(() => resetCardIds());

  function mkCard(rank: Card["rank"] = "5", suit: Card["suit"] = "spades"): Card {
    return { id: nextCardId(), rank, suit };
  }

  test("applies an edition to the single selected card", () => {
    const a = mkCard();
    const b = mkCard("7", "hearts");
    const result = applyAuraToSelectedInHand([a, b], new Set([a.id]), sequenceRng([0]));
    expect(result.find((c) => c.id === a.id)?.edition).toBe("foil");
  });

  test("leaves unselected cards unchanged (negative)", () => {
    const a = mkCard();
    const b = mkCard("7", "hearts");
    const result = applyAuraToSelectedInHand([a, b], new Set([a.id]), sequenceRng([0]));
    expect(result.find((c) => c.id === b.id)?.edition).toBeUndefined();
  });

  test("picks Foil when rng selects index 0", () => {
    const a = mkCard();
    const result = applyAuraToSelectedInHand([a], new Set([a.id]), sequenceRng([0]));
    expect(result[0].edition).toBe("foil");
  });

  test("picks Holographic when rng selects index 1", () => {
    const a = mkCard();
    const result = applyAuraToSelectedInHand([a], new Set([a.id]), sequenceRng([0.5]));
    expect(result[0].edition).toBe("holographic");
  });

  test("picks Polychrome when rng selects index 2", () => {
    const a = mkCard();
    const result = applyAuraToSelectedInHand(
      [a],
      new Set([a.id]),
      sequenceRng([0.99]),
    );
    expect(result[0].edition).toBe("polychrome");
  });

  test("returns the same hand reference when zero cards are selected (negative)", () => {
    const a = mkCard();
    const hand = [a];
    expect(applyAuraToSelectedInHand(hand, new Set(), sequenceRng([0]))).toBe(hand);
  });

  test("returns the same hand reference when more than one card is selected (negative)", () => {
    const a = mkCard();
    const b = mkCard("7", "hearts");
    const hand = [a, b];
    expect(
      applyAuraToSelectedInHand(hand, new Set([a.id, b.id]), sequenceRng([0])),
    ).toBe(hand);
  });

  test("does not mutate the original card object (negative)", () => {
    const a = mkCard();
    applyAuraToSelectedInHand([a], new Set([a.id]), sequenceRng([0]));
    expect(a.edition).toBeUndefined();
  });
});

describe("Hidden-rarity spectrals", () => {
  test("Black Hole is marked hidden", () => {
    expect(find("black-hole").hidden).toBe(true);
  });

  test("The Soul is marked hidden", () => {
    expect(find("soul").hidden).toBe(true);
  });

  test("createPoolSpectralCatalog excludes Black Hole", () => {
    expect(
      createPoolSpectralCatalog().some((s) => s.id === "black-hole"),
    ).toBe(false);
  });

  test("createPoolSpectralCatalog excludes The Soul", () => {
    expect(createPoolSpectralCatalog().some((s) => s.id === "soul")).toBe(false);
  });

  test("createPoolSpectralCatalog has fewer entries than the full catalog", () => {
    expect(createPoolSpectralCatalog().length).toBe(
      createSpectralCatalog().length - 2,
    );
  });

  test("createSpectralCatalog still contains both hidden spectrals", () => {
    const ids = createSpectralCatalog().map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(["black-hole", "soul"]));
  });

  test("HIDDEN_SPECTRAL_REPLACE_CHANCE is 0.003", () => {
    expect(HIDDEN_SPECTRAL_REPLACE_CHANCE).toBe(0.003);
  });
});

describe("rollHiddenSpectralReplacement", () => {
  const catalog = createSpectralCatalog();

  test("returns null when the roll misses", () => {
    expect(rollHiddenSpectralReplacement(sequenceRng([0.5]), catalog)).toBeNull();
  });

  test("returns Black Hole when the roll lands in the first 0.3% slice", () => {
    const r = rollHiddenSpectralReplacement(sequenceRng([0.001]), catalog);
    expect(r?.id).toBe("black-hole");
  });

  test("returns The Soul when the roll lands in the 0.3-0.6% slice", () => {
    const r = rollHiddenSpectralReplacement(sequenceRng([0.004]), catalog);
    expect(r?.id).toBe("soul");
  });

  test("Black Hole wins on the boundary value 0 (mutual exclusion)", () => {
    const r = rollHiddenSpectralReplacement(sequenceRng([0]), catalog);
    expect(r?.id).toBe("black-hole");
  });

  test("returns null when roll value equals the cumulative threshold (negative)", () => {
    const r = rollHiddenSpectralReplacement(
      sequenceRng([HIDDEN_SPECTRAL_REPLACE_CHANCE * 2]),
      catalog,
    );
    expect(r).toBeNull();
  });

  test("returns null when catalog has no hidden spectrals (negative)", () => {
    const empty = catalog.filter((s) => !s.hidden);
    expect(rollHiddenSpectralReplacement(sequenceRng([0.001]), empty)).toBeNull();
  });
});
