import {
  HAW_TAROT_OVERRIDES,
  localizedConsumableDescription,
  localizedConsumableName,
} from "./contentOverrides";
import { createTarotCatalog } from "../items/tarots";

describe("contentOverrides", () => {
  test("localizedConsumableName routes a planet id through the en.planetNames/haw.planetNames pair", () => {
    expect(localizedConsumableName("haw", "mercury", "Mercury")).toBe("ʻUkali");
  });

  test("localizedConsumableName routes a spectral id through the en.spectralNames/haw.spectralNames pair", () => {
    expect(localizedConsumableName("en", "black-hole", "Black Hole")).toBe(
      "Black Hole",
    );
  });

  test("localizedConsumableName returns the fallback under en (negative)", () => {
    expect(localizedConsumableName("en", "mercury", "Mercury")).toBe("Mercury");
  });

  test("localizedConsumableName returns the fallback for an unknown id under haw (negative)", () => {
    expect(localizedConsumableName("haw", "not-a-consumable", "Fallback")).toBe(
      "Fallback",
    );
  });

  test("localizedConsumableDescription returns the fallback for an unknown id under haw (negative)", () => {
    expect(
      localizedConsumableDescription("haw", "not-a-consumable", "Level up Pair"),
    ).toBe("Level up Pair");
  });

  test("every haw tarot override id exists in the tarot catalog", () => {
    const known = new Set(createTarotCatalog().map((item) => item.id));
    const unknown = Object.keys(HAW_TAROT_OVERRIDES).filter(
      (id) => !known.has(id),
    );
    expect(unknown).toEqual([]);
  });
});
