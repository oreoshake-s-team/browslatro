import {
  HAW_CONSUMABLE_OVERRIDES,
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

  test("every haw override id exists in a consumable catalog", () => {
    const known = new Set(
      [
        ...createPlanetCatalog(),
        ...createTarotCatalog(),
        ...createSpectralCatalog(),
      ].map((item) => item.id),
    );
    const unknown = Object.keys(HAW_CONSUMABLE_OVERRIDES).filter(
      (id) => !known.has(id),
    );
    expect(unknown).toEqual([]);
  });
});
