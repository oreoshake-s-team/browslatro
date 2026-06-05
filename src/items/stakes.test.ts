// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  STAKE_ORDER,
  createStakeCatalog,
  getActiveStakeModifiers,
  getActiveStakes,
  getStakeSpec,
  hasStakeModifier,
  stakeRank,
  stakeStickerOdds,
  type Stake,
} from "./stakes";

describe("STAKE_ORDER", () => {
  test("starts with White and ends with Gold", () => {
    expect([STAKE_ORDER[0], STAKE_ORDER[STAKE_ORDER.length - 1]]).toEqual([
      "white",
      "gold",
    ]);
  });

  test("contains all 8 canonical Balatro stakes in order", () => {
    expect(STAKE_ORDER).toEqual([
      "white",
      "red",
      "green",
      "black",
      "blue",
      "purple",
      "orange",
      "gold",
    ]);
  });
});

describe("createStakeCatalog", () => {
  test("returns a spec for every stake in STAKE_ORDER", () => {
    const ids = createStakeCatalog().map((s) => s.id);
    expect(ids).toEqual([...STAKE_ORDER]);
  });

});

describe("getStakeSpec", () => {
  test("returns the matching spec for a known id", () => {
    expect(getStakeSpec("white").name).toBe("White Stake");
  });

  test("throws for unknown stake id", () => {
    expect(() => getStakeSpec("invalid" as unknown as Stake)).toThrow(
      "unknown stake: invalid",
    );
  });
});

describe("stakeRank", () => {
  test("ranks White as 0", () => {
    expect(stakeRank("white")).toBe(0);
  });

  test("ranks Gold as 7", () => {
    expect(stakeRank("gold")).toBe(7);
  });
});

describe("getActiveStakes", () => {
  test("returns only White at the White tier", () => {
    expect(getActiveStakes("white")).toEqual(["white"]);
  });

  test("returns every tier up to and including the selected one", () => {
    expect(getActiveStakes("green")).toEqual(["white", "red", "green"]);
  });

  test("returns all 8 tiers at Gold", () => {
    expect(getActiveStakes("gold")).toEqual([...STAKE_ORDER]);
  });
});

describe("getActiveStakeModifiers", () => {
  test("returns an empty list at White (no modifiers wired yet)", () => {
    expect(getActiveStakeModifiers("white")).toEqual([]);
  });

  test("returns the Red modifier at Red", () => {
    expect(
      getActiveStakeModifiers("red").some(
        (m) => m.kind === "red-small-blind-no-reward",
      ),
    ).toBe(true);
  });

  test("Red modifier persists into Gold (cumulative)", () => {
    expect(
      getActiveStakeModifiers("gold").some(
        (m) => m.kind === "red-small-blind-no-reward",
      ),
    ).toBe(true);
  });
});

describe("hasStakeModifier", () => {
  test("is false at White for the Red modifier (negative)", () => {
    expect(hasStakeModifier("white", "red-small-blind-no-reward")).toBe(false);
  });

  test("is true at Red for the Red modifier", () => {
    expect(hasStakeModifier("red", "red-small-blind-no-reward")).toBe(true);
  });

  test("is true at Gold for the Red modifier (cumulative)", () => {
    expect(hasStakeModifier("gold", "red-small-blind-no-reward")).toBe(true);
  });
});

describe("StakeSpec.implemented", () => {
  test("White, Red, Green, and Black are implemented", () => {
    const implemented = createStakeCatalog()
      .filter((s) => s.implemented)
      .map((s) => s.id);
    expect(implemented).toEqual(["white", "red", "green", "black"]);
  });

  test("Blue through Gold are not implemented (negative)", () => {
    const unimplemented = createStakeCatalog()
      .filter((s) => !s.implemented)
      .map((s) => s.id);
    expect(unimplemented).toEqual(["blue", "purple", "orange", "gold"]);
  });
});

describe("Black Stake — black-eternal-roll modifier (#555)", () => {
  test("Black Stake carries the black-eternal-roll modifier", () => {
    expect(hasStakeModifier("black", "black-eternal-roll")).toBe(true);
  });

  test("Red Stake does not carry the black-eternal-roll modifier (negative)", () => {
    expect(hasStakeModifier("red", "black-eternal-roll")).toBe(false);
  });

  test("the modifier's chance defaults to BLACK_ETERNAL_ROLL_CHANCE", () => {
    const mod = getActiveStakeModifiers("black").find(
      (m) => m.kind === "black-eternal-roll",
    );
    expect(mod && "chance" in mod ? mod.chance : null).toBeCloseTo(0.3);
  });

  test("higher stakes still carry the black-eternal-roll modifier (cumulative)", () => {
    expect(hasStakeModifier("gold", "black-eternal-roll")).toBe(true);
  });
});

describe("stakeStickerOdds", () => {
  test("returns undefined for stakes below Black", () => {
    expect(stakeStickerOdds("green")).toBeUndefined();
  });

  test("returns eternal odds at Black Stake", () => {
    expect(stakeStickerOdds("black")?.eternal).toBeCloseTo(0.3);
  });

  test("returns eternal odds at Gold Stake too (cumulative)", () => {
    expect(stakeStickerOdds("gold")?.eternal).toBeCloseTo(0.3);
  });
});
