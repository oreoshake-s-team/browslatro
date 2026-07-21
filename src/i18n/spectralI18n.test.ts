import { describe, expect, test } from "vitest";
import { createSpectralCatalog } from "../items/spectrals";
import { en } from "./locales/en";

const names: Record<string, string> = en.spectralNames;
const descriptions: Record<string, string> = en.spectralDescriptions;

describe("spectral i18n coverage", () => {
  test("every catalog spectral has an en name", () => {
    const missing = createSpectralCatalog()
      .filter((spectral) => names[spectral.id] === undefined)
      .map((spectral) => spectral.id);
    expect(missing).toEqual([]);
  });

  test("every catalog spectral has an en description", () => {
    const missing = createSpectralCatalog()
      .filter((spectral) => descriptions[spectral.id] === undefined)
      .map((spectral) => spectral.id);
    expect(missing).toEqual([]);
  });

  test("every en spectral description matches the catalog's generated description", () => {
    const mismatched = createSpectralCatalog()
      .filter((spectral) => descriptions[spectral.id] !== spectral.description)
      .map((spectral) => spectral.id);
    expect(mismatched).toEqual([]);
  });

  test("every en spectral name matches the catalog's literal name", () => {
    const mismatched = createSpectralCatalog()
      .filter((spectral) => names[spectral.id] !== spectral.name)
      .map((spectral) => spectral.id);
    expect(mismatched).toEqual([]);
  });
});
