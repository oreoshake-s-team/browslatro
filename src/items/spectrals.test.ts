import {
  FAMILIAR_ADD_COUNT,
  GRIM_ADD_COUNT,
  INCANTATION_ADD_COUNT,
  IMMOLATE_DESTROY_COUNT,
  IMMOLATE_MONEY_GAIN,
  SPECTRAL_BASE_PRICE,
  createSpectralCatalog,
  makeEnhancedCard,
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
  ])("includes $name", ({ id, name }) => {
    expect(find(id).name).toBe(name);
  });

  test("spans 5 distinct effect kinds", () => {
    const kinds = new Set(createSpectralCatalog().map((c) => c.effect.kind));
    expect(kinds.size).toBe(5);
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

describe("SPECTRAL_BASE_PRICE", () => {
  test("is a positive number", () => {
    expect(SPECTRAL_BASE_PRICE).toBeGreaterThan(0);
  });

  test("is more expensive than a tarot card", () => {
    expect(SPECTRAL_BASE_PRICE).toBeGreaterThan(3);
  });
});
