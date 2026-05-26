import {
  IMMOLATE_DESTROY_COUNT,
  IMMOLATE_MONEY_GAIN,
  SPECTRAL_BASE_PRICE,
  createSpectralCatalog,
  type SpectralCard,
} from "./spectrals";

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

  test("includes Black Hole", () => {
    expect(find("black-hole").name).toBe("Black Hole");
  });

  test("includes Immolate", () => {
    expect(find("immolate").name).toBe("Immolate");
  });

  test("includes Sigil", () => {
    expect(find("sigil").name).toBe("Sigil");
  });

  test("includes Talisman", () => {
    expect(find("talisman").name).toBe("Talisman");
  });

  test("includes Deja Vu", () => {
    expect(find("deja-vu").name).toBe("Deja Vu");
  });

  test("includes Trance", () => {
    expect(find("trance").name).toBe("Trance");
  });

  test("includes Medium", () => {
    expect(find("medium").name).toBe("Medium");
  });

  test("spans 4 distinct effect kinds", () => {
    const kinds = new Set(createSpectralCatalog().map((c) => c.effect.kind));
    expect(kinds.size).toBe(4);
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

  test("Talisman description names the Gold Seal", () => {
    expect(find("talisman").description).toMatch(/Gold Seal/);
  });

  test("Deja Vu description names the Red Seal", () => {
    expect(find("deja-vu").description).toMatch(/Red Seal/);
  });

  test("Trance description names the Blue Seal", () => {
    expect(find("trance").description).toMatch(/Blue Seal/);
  });

  test("Medium description names the Purple Seal", () => {
    expect(find("medium").description).toMatch(/Purple Seal/);
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

describe("SPECTRAL_BASE_PRICE", () => {
  test("is a positive number", () => {
    expect(SPECTRAL_BASE_PRICE).toBeGreaterThan(0);
  });

  test("is more expensive than a tarot card", () => {
    expect(SPECTRAL_BASE_PRICE).toBeGreaterThan(3);
  });
});
