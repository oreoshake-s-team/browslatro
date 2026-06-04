import {
  addConsumable,
  consumableSellValue,
  consumableUseBlock,
  hasFreeConsumableSlot,
  removeConsumableAt,
  type Consumable,
} from "./consumables";
import { createPlanetCatalog } from "./planets";
import { createSpectralCatalog } from "./spectrals";
import { createTarotCatalog } from "./tarots";

const planet = createPlanetCatalog()[0];
const tarot = createTarotCatalog()[0];
const spectral = createSpectralCatalog()[0];
const planetConsumable: Consumable = { kind: "planet", card: planet };
const tarotConsumable: Consumable = { kind: "tarot", card: tarot };
const spectralConsumable: Consumable = { kind: "spectral", card: spectral };

describe("consumables", () => {
  test("hasFreeConsumableSlot true when below cap", () => {
    expect(hasFreeConsumableSlot([planetConsumable])).toBe(true);
  });

  test("hasFreeConsumableSlot false when at cap", () => {
    expect(
      hasFreeConsumableSlot([planetConsumable, tarotConsumable]),
    ).toBe(false);
  });

  test("addConsumable appends when slots available", () => {
    const result = addConsumable([], planetConsumable);
    expect(result).toEqual([planetConsumable]);
  });

  test("addConsumable preserves order across mixed kinds", () => {
    const result = addConsumable([planetConsumable], tarotConsumable);
    expect(result).toEqual([planetConsumable, tarotConsumable]);
  });

  test("addConsumable is a no-op when slots full", () => {
    const full = [planetConsumable, tarotConsumable];
    const result = addConsumable(full, planetConsumable);
    expect(result).toBe(full);
  });

  test("removeConsumableAt removes the targeted entry", () => {
    const result = removeConsumableAt(
      [planetConsumable, tarotConsumable],
      0,
    );
    expect(result).toEqual([tarotConsumable]);
  });

  test("removeConsumableAt with out-of-range index returns the same array", () => {
    const list = [planetConsumable];
    expect(removeConsumableAt(list, 5)).toBe(list);
  });

  test("removeConsumableAt with negative index returns the same array", () => {
    const list = [planetConsumable];
    expect(removeConsumableAt(list, -1)).toBe(list);
  });

  test("hasFreeConsumableSlot respects a custom capacity override", () => {
    expect(
      hasFreeConsumableSlot([planetConsumable, tarotConsumable], 3),
    ).toBe(true);
  });

  test("hasFreeConsumableSlot returns false when at the custom capacity", () => {
    expect(
      hasFreeConsumableSlot([planetConsumable, tarotConsumable], 2),
    ).toBe(false);
  });

  test("addConsumable respects a custom capacity that permits the add", () => {
    const full = [planetConsumable, tarotConsumable];
    const result = addConsumable(full, planetConsumable, 3);
    expect(result).toHaveLength(3);
  });

  test("addConsumable still no-ops when at the custom capacity", () => {
    const full = [planetConsumable, tarotConsumable];
    const result = addConsumable(full, planetConsumable, 2);
    expect(result).toBe(full);
  });

  test("consumableSellValue returns half the planet base price, floored", () => {
    expect(consumableSellValue(planetConsumable)).toBe(1);
  });

  test("consumableSellValue returns half the tarot base price, floored", () => {
    expect(consumableSellValue(tarotConsumable)).toBe(1);
  });

  test("consumableUseBlock returns null for a planet regardless of selection", () => {
    expect(consumableUseBlock(planetConsumable, 0)).toBeNull();
  });

  test("consumableUseBlock blocks an enhancement tarot with zero selection", () => {
    const enhTarot = createTarotCatalog().find(
      (t) => t.effect.kind === "apply-enhancement",
    );
    if (!enhTarot) throw new Error("no enhancement tarot in catalog");
    const c: Consumable = { kind: "tarot", card: enhTarot };
    expect(consumableUseBlock(c, 0)).toMatch(/Select/);
  });

  test("consumableUseBlock blocks an enhancement tarot when too many selected", () => {
    const enhTarot = createTarotCatalog().find(
      (t) => t.effect.kind === "apply-enhancement",
    );
    if (!enhTarot) throw new Error("no enhancement tarot in catalog");
    const c: Consumable = { kind: "tarot", card: enhTarot };
    const maxTargets =
      enhTarot.effect.kind === "apply-enhancement"
        ? enhTarot.effect.maxTargets
        : 1;
    expect(consumableUseBlock(c, maxTargets + 1)).toMatch(/Too many/);
  });

  test("consumableUseBlock returns null for a money-multiply tarot regardless of selection", () => {
    const hermit = createTarotCatalog().find((t) => t.id === "the-hermit");
    if (!hermit) throw new Error("missing hermit");
    const c: Consumable = { kind: "tarot", card: hermit };
    expect(consumableUseBlock(c, 0)).toBeNull();
  });

  test("addConsumable accepts a spectral consumable", () => {
    expect(addConsumable([], spectralConsumable)).toEqual([spectralConsumable]);
  });

  test("consumableSellValue returns half the spectral base price, floored", () => {
    expect(consumableSellValue(spectralConsumable)).toBe(2);
  });

  test("consumableUseBlock returns null for a non-seal spectral with zero selection", () => {
    expect(consumableUseBlock(spectralConsumable, 0)).toBeNull();
  });

  test("consumableUseBlock returns null for a non-seal spectral even with many cards selected", () => {
    expect(consumableUseBlock(spectralConsumable, 5)).toBeNull();
  });

  test("consumableUseBlock blocks an apply-seal spectral with zero selection", () => {
    const sealSpectral = createSpectralCatalog().find(
      (s) => s.effect.kind === "apply-seal",
    );
    if (!sealSpectral) throw new Error("no apply-seal spectral in catalog");
    const c: Consumable = { kind: "spectral", card: sealSpectral };
    expect(consumableUseBlock(c, 0)).toMatch(/Select/);
  });

  test("consumableUseBlock blocks an apply-seal spectral when too many cards are selected", () => {
    const sealSpectral = createSpectralCatalog().find(
      (s) => s.effect.kind === "apply-seal",
    );
    if (!sealSpectral) throw new Error("no apply-seal spectral in catalog");
    const c: Consumable = { kind: "spectral", card: sealSpectral };
    expect(consumableUseBlock(c, 2)).toMatch(/Too many/);
  });

  test("consumableUseBlock returns null for an apply-seal spectral with exactly 1 selected", () => {
    const sealSpectral = createSpectralCatalog().find(
      (s) => s.effect.kind === "apply-seal",
    );
    if (!sealSpectral) throw new Error("no apply-seal spectral in catalog");
    const c: Consumable = { kind: "spectral", card: sealSpectral };
    expect(consumableUseBlock(c, 1)).toBeNull();
  });

  test("consumableUseBlock blocks a duplicate-selected spectral with zero selection", () => {
    const cryptid = createSpectralCatalog().find(
      (s) => s.effect.kind === "duplicate-selected",
    );
    if (!cryptid) throw new Error("no duplicate-selected spectral in catalog");
    const c: Consumable = { kind: "spectral", card: cryptid };
    expect(consumableUseBlock(c, 0)).toMatch(/Select/);
  });

  test("consumableUseBlock blocks a duplicate-selected spectral when too many cards are selected", () => {
    const cryptid = createSpectralCatalog().find(
      (s) => s.effect.kind === "duplicate-selected",
    );
    if (!cryptid) throw new Error("no duplicate-selected spectral in catalog");
    const c: Consumable = { kind: "spectral", card: cryptid };
    expect(consumableUseBlock(c, 2)).toMatch(/Too many/);
  });

  test("consumableUseBlock returns null for a duplicate-selected spectral with exactly 1 selected", () => {
    const cryptid = createSpectralCatalog().find(
      (s) => s.effect.kind === "duplicate-selected",
    );
    if (!cryptid) throw new Error("no duplicate-selected spectral in catalog");
    const c: Consumable = { kind: "spectral", card: cryptid };
    expect(consumableUseBlock(c, 1)).toBeNull();
  });

  test("previewMode blocks a duplicate-selected spectral even with 1 selected", () => {
    const cryptid = createSpectralCatalog().find(
      (s) => s.effect.kind === "duplicate-selected",
    );
    if (!cryptid) throw new Error("no duplicate-selected spectral in catalog");
    const c: Consumable = { kind: "spectral", card: cryptid };
    expect(consumableUseBlock(c, 1, true)).toMatch(/pack/);
  });

  test("previewMode allows an enhancement tarot with a valid preview selection", () => {
    const enhTarot = createTarotCatalog().find(
      (t) => t.effect.kind === "apply-enhancement",
    );
    if (!enhTarot) throw new Error("no enhancement tarot in catalog");
    const c: Consumable = { kind: "tarot", card: enhTarot };
    expect(consumableUseBlock(c, 1, true)).toBeNull();
  });

  test("previewMode blocks an enhancement tarot with zero preview selection", () => {
    const enhTarot = createTarotCatalog().find(
      (t) => t.effect.kind === "apply-enhancement",
    );
    if (!enhTarot) throw new Error("no enhancement tarot in catalog");
    const c: Consumable = { kind: "tarot", card: enhTarot };
    expect(consumableUseBlock(c, 0, true)).toMatch(/preview/);
  });

  test("previewMode allows an apply-seal spectral with a valid preview selection", () => {
    const sealSpectral = createSpectralCatalog().find(
      (s) => s.effect.kind === "apply-seal",
    );
    if (!sealSpectral) throw new Error("no apply-seal spectral in catalog");
    const c: Consumable = { kind: "spectral", card: sealSpectral };
    expect(consumableUseBlock(c, 1, true)).toBeNull();
  });

  test("previewMode blocks an apply-seal spectral with zero preview selection", () => {
    const sealSpectral = createSpectralCatalog().find(
      (s) => s.effect.kind === "apply-seal",
    );
    if (!sealSpectral) throw new Error("no apply-seal spectral in catalog");
    const c: Consumable = { kind: "spectral", card: sealSpectral };
    expect(consumableUseBlock(c, 0, true)).toMatch(/preview/);
  });

  test("previewMode returns null for a planet", () => {
    expect(consumableUseBlock(planetConsumable, 0, true)).toBeNull();
  });

  test("previewMode returns null for a non-seal spectral", () => {
    expect(consumableUseBlock(spectralConsumable, 0, true)).toBeNull();
  });

  test("consumableUseBlock blocks The Hanged Man with zero selection", () => {
    const hangedMan = createTarotCatalog().find(
      (t) => t.id === "the-hanged-man",
    );
    if (!hangedMan) throw new Error("no hanged-man in catalog");
    const c: Consumable = { kind: "tarot", card: hangedMan };
    expect(consumableUseBlock(c, 0)).toMatch(/Select/);
  });

  test("consumableUseBlock blocks The Hanged Man when more than 2 cards are selected", () => {
    const hangedMan = createTarotCatalog().find(
      (t) => t.id === "the-hanged-man",
    );
    if (!hangedMan) throw new Error("no hanged-man in catalog");
    const c: Consumable = { kind: "tarot", card: hangedMan };
    expect(consumableUseBlock(c, 3)).toMatch(/Too many/);
  });

  test("consumableUseBlock returns null for The Hanged Man with 1 or 2 selected", () => {
    const hangedMan = createTarotCatalog().find(
      (t) => t.id === "the-hanged-man",
    );
    if (!hangedMan) throw new Error("no hanged-man in catalog");
    const c: Consumable = { kind: "tarot", card: hangedMan };
    expect(consumableUseBlock(c, 2)).toBeNull();
  });

  test("previewMode blocks The Hanged Man even with a valid selection", () => {
    const hangedMan = createTarotCatalog().find(
      (t) => t.id === "the-hanged-man",
    );
    if (!hangedMan) throw new Error("no hanged-man in catalog");
    const c: Consumable = { kind: "tarot", card: hangedMan };
    expect(consumableUseBlock(c, 1, true)).toMatch(/pack/);
  });

  test("consumableUseBlock blocks Strength with zero selection", () => {
    const strength = createTarotCatalog().find((t) => t.id === "strength");
    if (!strength) throw new Error("no strength in catalog");
    const c: Consumable = { kind: "tarot", card: strength };
    expect(consumableUseBlock(c, 0)).toMatch(/Select/);
  });

  test("consumableUseBlock blocks Strength when more than 2 cards are selected", () => {
    const strength = createTarotCatalog().find((t) => t.id === "strength");
    if (!strength) throw new Error("no strength in catalog");
    const c: Consumable = { kind: "tarot", card: strength };
    expect(consumableUseBlock(c, 3)).toMatch(/Too many/);
  });

  test("consumableUseBlock returns null for Strength with 1 or 2 selected", () => {
    const strength = createTarotCatalog().find((t) => t.id === "strength");
    if (!strength) throw new Error("no strength in catalog");
    const c: Consumable = { kind: "tarot", card: strength };
    expect(consumableUseBlock(c, 2)).toBeNull();
  });

  test("previewMode blocks Strength even with a valid selection", () => {
    const strength = createTarotCatalog().find((t) => t.id === "strength");
    if (!strength) throw new Error("no strength in catalog");
    const c: Consumable = { kind: "tarot", card: strength };
    expect(consumableUseBlock(c, 1, true)).toMatch(/pack/);
  });
});
