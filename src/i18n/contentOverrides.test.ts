import {
  HAW_SPECTRAL_OVERRIDES,
  HAW_TAROT_OVERRIDES,
  localizedConsumableDescription,
  localizedConsumableName,
} from "./contentOverrides";
import { createTarotCatalog } from "../items/tarots";
import { createSpectralCatalog } from "../items/spectrals";

describe("contentOverrides", () => {
  test("localizedConsumableName routes a planet id through the en.planetNames/haw.planetNames pair", () => {
    expect(localizedConsumableName("haw", "mercury", "Mercury")).toBe("ʻUkali");
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

  test("every haw spectral override id exists in the spectral catalog", () => {
    const known = new Set(createSpectralCatalog().map((item) => item.id));
    const unknown = Object.keys(HAW_SPECTRAL_OVERRIDES).filter(
      (id) => !known.has(id),
    );
    expect(unknown).toEqual([]);
  });

  test("per-type override ids never collide across types", () => {
    const ids = [...Object.keys(HAW_TAROT_OVERRIDES), ...Object.keys(HAW_SPECTRAL_OVERRIDES)];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
