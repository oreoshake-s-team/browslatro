// @vitest-environment node
import { readSeededConsumables } from "./seedConsumables";

function stubSeeds(values: Readonly<Record<string, string>>) {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => values[key] ?? null,
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readSeededConsumables (dev flags, #856)", () => {
  test("seeds tarots from browslatro:seedTarotIds", () => {
    stubSeeds({ "browslatro:seedTarotIds": "the-sun" });
    const seeded = readSeededConsumables();
    expect(seeded).toHaveLength(1);
    expect(seeded[0].kind === "tarot" && seeded[0].card.id).toBe("the-sun");
  });

  test("seeds spectrals from browslatro:seedSpectralIds", () => {
    stubSeeds({ "browslatro:seedSpectralIds": "black-hole" });
    const seeded = readSeededConsumables();
    expect(seeded).toHaveLength(1);
    expect(seeded[0].kind === "spectral" && seeded[0].card.id).toBe(
      "black-hole",
    );
  });

  test("ignores unknown ids", () => {
    stubSeeds({ "browslatro:seedTarotIds": "not-a-tarot,the-hermit" });
    const seeded = readSeededConsumables();
    expect(seeded).toHaveLength(1);
    expect(seeded[0].kind === "tarot" && seeded[0].card.id).toBe("the-hermit");
  });

  test("caps the seeded tray at the base consumable capacity", () => {
    stubSeeds({
      "browslatro:seedTarotIds": "the-sun,the-hermit,strength",
    });
    expect(readSeededConsumables()).toHaveLength(2);
  });

  test("returns an empty list when no flags are set (production no-op)", () => {
    stubSeeds({});
    expect(readSeededConsumables()).toEqual([]);
  });

  test("returns an empty list when window is unavailable", () => {
    expect(readSeededConsumables()).toEqual([]);
  });
});
