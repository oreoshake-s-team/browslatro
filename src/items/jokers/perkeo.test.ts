// @vitest-environment node
import {
  createJokerCatalog,
  createLegendaryJokerCatalog,
  createPerkeoJoker,
  shopExitConsumableCopies,
} from "../jokers";
import type { JokerRarity } from "../jokers";

function fixedRng(values: ReadonlyArray<number>): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe("Perkeo (#1037)", () => {
  test("is registered in the legendary pool", () => {
    const ids = createLegendaryJokerCatalog().map((j) => j.id);
    expect(ids).toContain("perkeo");
  });

  test("is not in the regular shop catalog (negative)", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).not.toContain("perkeo");
  });

  test("has legendary rarity", () => {
    expect(createPerkeoJoker().rarity).toBe<JokerRarity>("legendary");
  });

  test("copies a random held consumable on shop exit", () => {
    const copies = shopExitConsumableCopies(
      [createPerkeoJoker()],
      ["fool", "mercury"],
      fixedRng([0.9]),
    );
    expect(copies).toEqual(["mercury"]);
  });

  test("each Perkeo produces its own copy", () => {
    const copies = shopExitConsumableCopies(
      [createPerkeoJoker(), createPerkeoJoker()],
      ["fool"],
      fixedRng([0]),
    );
    expect(copies).toEqual(["fool", "fool"]);
  });

  test("an empty tray is a no-op (negative)", () => {
    const copies = shopExitConsumableCopies(
      [createPerkeoJoker()],
      [],
      fixedRng([0]),
    );
    expect(copies).toEqual([]);
  });

  test("without Perkeo nothing is copied (negative)", () => {
    const copies = shopExitConsumableCopies(
      createJokerCatalog().slice(0, 1),
      ["fool"],
      fixedRng([0]),
    );
    expect(copies).toEqual([]);
  });
});
