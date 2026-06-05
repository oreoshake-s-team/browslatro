import { describe, expect, test } from "vitest";
import { EDITION_BASE_RATES, rollEdition } from "./jokers";
import {
  editionRateMultiplier,
  VOUCHER_CATALOG,
  type VoucherId,
} from "./vouchers";

function ownedSet(ids: ReadonlyArray<VoucherId>): ReadonlySet<VoucherId> {
  return new Set(ids);
}

describe("Hone + Glow Up catalog entries", () => {
  test("hone is in the catalog", () => {
    expect(VOUCHER_CATALOG.some((v) => v.id === "hone")).toBe(true);
  });

  test("glow-up is in the catalog", () => {
    expect(VOUCHER_CATALOG.some((v) => v.id === "glow-up")).toBe(true);
  });

  test("glow-up requires hone", () => {
    const glowUp = VOUCHER_CATALOG.find((v) => v.id === "glow-up");
    expect(glowUp?.requires).toBe("hone");
  });
});

describe("editionRateMultiplier", () => {
  test("returns 1 with no vouchers owned", () => {
    expect(editionRateMultiplier(ownedSet([]))).toBe(1);
  });

  test("returns 2 with hone owned", () => {
    expect(editionRateMultiplier(ownedSet(["hone"]))).toBe(2);
  });

  test("returns 4 with glow-up owned", () => {
    expect(editionRateMultiplier(ownedSet(["hone", "glow-up"]))).toBe(4);
  });

  test("prefers glow-up (4×) over hone (2×) when both are owned", () => {
    expect(editionRateMultiplier(ownedSet(["hone", "glow-up"]))).toBe(4);
  });
});

describe("EDITION_BASE_RATES", () => {
  test("matches Balatro semantics: Foil 4%, Holographic 2%, Polychrome 0.3%", () => {
    expect(EDITION_BASE_RATES).toEqual({
      foil: 0.04,
      holographic: 0.02,
      polychrome: 0.003,
    });
  });
});

describe("rollEdition", () => {
  test("returns undefined when the roll lands in the no-edition zone", () => {
    expect(rollEdition(() => 0.5)).toBeUndefined();
  });

  test("returns polychrome when the roll is below polychrome's rate", () => {
    expect(rollEdition(() => 0.001)).toBe("polychrome");
  });

  test("returns holographic when the roll is between polychrome and polychrome+holographic", () => {
    expect(rollEdition(() => 0.01)).toBe("holographic");
  });

  test("returns foil when the roll is between holo end and foil end", () => {
    expect(rollEdition(() => 0.04)).toBe("foil");
  });

  test("a 2× multiplier doubles the foil band so a roll just above the base total now hits foil", () => {
    const r = 0.08;
    expect(rollEdition(() => r, 1)).toBeUndefined();
    expect(rollEdition(() => r, 2)).toBe("foil");
  });

  test("a 4× multiplier widens the polychrome band proportionally", () => {
    const r = EDITION_BASE_RATES.polychrome + 0.005;
    expect(rollEdition(() => r, 1)).not.toBe("polychrome");
    expect(rollEdition(() => r, 4)).toBe("polychrome");
  });

  test("over 100 seeded shop jokers, owning Glow Up produces more editions than no voucher", () => {
    function countEditions(multiplier: number): number {
      let count = 0;
      let seed = 1;
      const rng = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
      for (let i = 0; i < 100; i += 1) {
        if (rollEdition(rng, multiplier) !== undefined) count += 1;
      }
      return count;
    }
    expect(countEditions(4)).toBeGreaterThan(countEditions(1));
  });
});
