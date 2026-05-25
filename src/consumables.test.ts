import {
  MAX_CONSUMABLE_SLOTS,
  addConsumable,
  hasFreeConsumableSlot,
  removeConsumableAt,
  type Consumable,
} from "./consumables";
import { createPlanetCatalog } from "./planets";
import { createTarotCatalog } from "./tarots";

const planet = createPlanetCatalog()[0];
const tarot = createTarotCatalog()[0];
const planetConsumable: Consumable = { kind: "planet", card: planet };
const tarotConsumable: Consumable = { kind: "tarot", card: tarot };

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
});
