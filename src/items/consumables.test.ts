import {
  MAX_CONSUMABLE_SLOTS,
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
  test("MAX_CONSUMABLE_SLOTS is 2", () => {
    expect(MAX_CONSUMABLE_SLOTS).toBe(2);
  });

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
});
