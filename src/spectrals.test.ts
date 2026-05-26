import {
  SPECTRAL_BASE_PRICE,
  createSpectralCatalog,
  type SpectralCard,
} from "./spectrals";

describe("createSpectralCatalog", () => {
  test("returns at least 3 spectral cards", () => {
    expect(createSpectralCatalog().length).toBeGreaterThanOrEqual(3);
  });

  test("every card has a unique id", () => {
    const ids = createSpectralCatalog().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every card has a non-empty name", () => {
    const catalog = createSpectralCatalog();
    expect(catalog.every((c) => c.name.length > 0)).toBe(true);
  });

  test("every card has a non-empty description", () => {
    const catalog = createSpectralCatalog();
    expect(catalog.every((c) => c.description.length > 0)).toBe(true);
  });

  test("includes at least one add-money effect", () => {
    const hasMoney = createSpectralCatalog().some(
      (c) => c.effect.kind === "add-money",
    );
    expect(hasMoney).toBe(true);
  });

  test("includes at least one add-hands effect", () => {
    const hasHands = createSpectralCatalog().some(
      (c) => c.effect.kind === "add-hands",
    );
    expect(hasHands).toBe(true);
  });

  test("includes at least one add-discards effect", () => {
    const hasDiscards = createSpectralCatalog().some(
      (c) => c.effect.kind === "add-discards",
    );
    expect(hasDiscards).toBe(true);
  });

  test("the catalog spans at least 3 distinct effect kinds", () => {
    const kinds = new Set(createSpectralCatalog().map((c) => c.effect.kind));
    expect(kinds.size).toBeGreaterThanOrEqual(3);
  });
});

describe("Spectral descriptions", () => {
  function find(id: SpectralCard["id"]): SpectralCard {
    const card = createSpectralCatalog().find((c) => c.id === id);
    if (!card) throw new Error(`missing spectral fixture: ${id}`);
    return card;
  }

  test("describes an add-money effect with a dollar sign and amount", () => {
    expect(find("spectre").description).toMatch(/\$\d+/);
  });

  test("describes an add-hands effect with the word 'hand'", () => {
    expect(find("wraith").description).toMatch(/hand/);
  });

  test("describes an add-discards effect with the word 'discard'", () => {
    expect(find("phantom").description).toMatch(/discard/);
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
