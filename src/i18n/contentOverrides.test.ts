import {
  HAW_PLANET_OVERRIDES,
  HAW_SPECTRAL_OVERRIDES,
  HAW_TAROT_OVERRIDES,
  localizedConsumableDescription,
  localizedConsumableName,
} from "./contentOverrides";
import { createPlanetCatalog } from "../items/planets";
import { createTarotCatalog } from "../items/tarots";
import { createSpectralCatalog } from "../items/spectrals";

describe("contentOverrides", () => {
  test("localizedConsumableName returns the haw override when present", () => {
    expect(localizedConsumableName("haw", "mercury", "Mercury")).toBe("ʻUkali");
  });

  test("localizedConsumableName returns the fallback under en (negative)", () => {
    expect(localizedConsumableName("en", "mercury", "Mercury")).toBe("Mercury");
  });

  test("localizedConsumableName returns the fallback for an un-overridden id under haw (negative)", () => {
    expect(localizedConsumableName("haw", "pluto", "Pluto")).toBe("Pluto");
  });

  test("localizedConsumableDescription falls back when only the name is overridden", () => {
    expect(
      localizedConsumableDescription("haw", "mercury", "Level up Pair"),
    ).toBe("Level up Pair");
  });

  test("every haw planet override id exists in the planet catalog", () => {
    const known = new Set(createPlanetCatalog().map((item) => item.id));
    const unknown = Object.keys(HAW_PLANET_OVERRIDES).filter(
      (id) => !known.has(id),
    );
    expect(unknown).toEqual([]);
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
    const ids = [
      ...Object.keys(HAW_PLANET_OVERRIDES),
      ...Object.keys(HAW_TAROT_OVERRIDES),
      ...Object.keys(HAW_SPECTRAL_OVERRIDES),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
