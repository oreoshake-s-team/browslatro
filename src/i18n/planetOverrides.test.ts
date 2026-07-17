import { localizedPlanetDescription, localizedPlanetName } from "./planetOverrides";

describe("planetOverrides", () => {
  test("localizedPlanetName returns the canonical i18n name, not the code fallback", () => {
    expect(localizedPlanetName("en", "venus", "Venus (fallback)")).toBe("Venus");
  });

  test("localizedPlanetName returns the fallback for an unknown id", () => {
    expect(localizedPlanetName("en", "not-a-planet", "Fallback")).toBe("Fallback");
  });

  test("localizedPlanetDescription returns the canonical en description", () => {
    expect(localizedPlanetDescription("en", "pluto", "fallback")).toBe(
      "Upgrades High Card: +1 Mult, +10 Chips",
    );
  });

  test("localizedPlanetDescription returns the fallback for an unknown id", () => {
    expect(localizedPlanetDescription("en", "not-a-planet", "Fallback")).toBe("Fallback");
  });

  test("a translated haw planet name returns the native text", () => {
    expect(localizedPlanetName("haw", "venus", "Venus")).toBe("Hōkūloa");
  });

  test("an untranslated haw planet name falls back to the English text", () => {
    expect(localizedPlanetName("haw", "pluto", "Pluto")).toBe("Pluto");
  });

  test("an untranslated haw planet description falls back to the English text", () => {
    expect(localizedPlanetDescription("haw", "venus", "fallback")).toBe(
      "Upgrades Three of a Kind: +2 Mult, +20 Chips",
    );
  });
});
