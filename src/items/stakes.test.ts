// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  DEFAULT_STAKE,
  STAKE_ORDER,
  createStakeCatalog,
  getActiveStakeModifiers,
  getActiveStakes,
  getStakeSpec,
  stakeRank,
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

describe("DEFAULT_STAKE", () => {
  test("defaults to White", () => {
    expect(DEFAULT_STAKE).toBe("white");
  });
});

describe("createStakeCatalog", () => {
  test("returns a spec for every stake in STAKE_ORDER", () => {
    const ids = createStakeCatalog().map((s) => s.id);
    expect(ids).toEqual([...STAKE_ORDER]);
  });

  test("every spec carries a non-empty name", () => {
    const names = createStakeCatalog().map((s) => s.name);
    expect(names.every((n) => n.length > 0)).toBe(true);
  });

  test("every spec carries a non-empty description", () => {
    const descs = createStakeCatalog().map((s) => s.description);
    expect(descs.every((d) => d.length > 0)).toBe(true);
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

  test("returns an empty list at intermediate stakes (Red)", () => {
    expect(getActiveStakeModifiers("red")).toEqual([]);
  });

  test("returns an empty list at Gold while per-stake effects are unimplemented", () => {
    expect(getActiveStakeModifiers("gold")).toEqual([]);
  });
});
