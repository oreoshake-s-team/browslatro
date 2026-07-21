import { localizedSpectralDescription, localizedSpectralName } from "./spectralOverrides";

describe("spectralOverrides", () => {
  test("localizedSpectralName returns the canonical i18n name, not the code fallback", () => {
    expect(localizedSpectralName("en", "hex", "Hex (fallback)")).toBe("Hex");
  });

  test("localizedSpectralName returns the fallback for an unknown id", () => {
    expect(localizedSpectralName("en", "not-a-spectral", "Fallback")).toBe("Fallback");
  });

  test("localizedSpectralDescription returns the canonical en description", () => {
    expect(localizedSpectralDescription("en", "black-hole", "fallback")).toBe(
      "Upgrade every poker hand by 1 level",
    );
  });

  test("localizedSpectralDescription returns the fallback for an unknown id", () => {
    expect(localizedSpectralDescription("en", "not-a-spectral", "Fallback")).toBe(
      "Fallback",
    );
  });

  test("an untranslated haw spectral name falls back to the English text", () => {
    expect(localizedSpectralName("haw", "hex", "Hex")).toBe("Hex");
  });

  test("an untranslated haw spectral description falls back to the English text", () => {
    expect(localizedSpectralDescription("haw", "black-hole", "fallback")).toBe(
      "Upgrade every poker hand by 1 level",
    );
  });
});
