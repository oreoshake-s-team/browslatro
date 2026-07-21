import {
  HAW_SPECTRAL_OVERRIDES,
  localizedConsumableDescription,
  localizedConsumableName,
} from "./contentOverrides";
import { createSpectralCatalog } from "../items/spectrals";

describe("contentOverrides", () => {
  test("localizedConsumableName routes a planet id through the en.planetNames/haw.planetNames pair", () => {
    expect(localizedConsumableName("haw", "mercury", "Mercury")).toBe("ʻUkali");
  });

  test("localizedConsumableName routes a tarot id through the en.tarotNames/haw.tarotNames pair", () => {
    expect(localizedConsumableName("en", "the-fool", "The Fool")).toBe("The Fool");
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

  test("every haw spectral override id exists in the spectral catalog", () => {
    const known = new Set(createSpectralCatalog().map((item) => item.id));
    const unknown = Object.keys(HAW_SPECTRAL_OVERRIDES).filter(
      (id) => !known.has(id),
    );
    expect(unknown).toEqual([]);
  });
});
