// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  BLUE_DISCARD_DELTA,
  STAKE_ORDER,
  createStakeCatalog,
  getActiveStakeModifiers,
  getActiveStakes,
  getStakeSpec,
  hasStakeModifier,
  stakeRank,
  stakeStartingDiscardsDelta,
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
  test("all 8 canonical stakes are implemented", () => {
    const implemented = createStakeCatalog()
      .filter((s) => s.implemented)
      .map((s) => s.id);
    expect(implemented).toEqual([
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

  test("no stakes remain unimplemented (negative)", () => {
    const unimplemented = createStakeCatalog()
      .filter((s) => !s.implemented)
      .map((s) => s.id);
    expect(unimplemented).toEqual([]);
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

describe("Blue Stake — blue-discard-delta modifier (#556)", () => {
  test("Blue Stake carries the blue-discard-delta modifier", () => {
    expect(hasStakeModifier("blue", "blue-discard-delta")).toBe(true);
  });

  test("Black Stake does not carry the blue-discard-delta modifier (negative)", () => {
    expect(hasStakeModifier("black", "blue-discard-delta")).toBe(false);
  });

  test("the modifier's amount is BLUE_DISCARD_DELTA (-1)", () => {
    const mod = getActiveStakeModifiers("blue").find(
      (m) => m.kind === "blue-discard-delta",
    );
    expect(mod && "amount" in mod ? mod.amount : null).toBe(BLUE_DISCARD_DELTA);
  });

  test("higher stakes still carry the blue-discard-delta modifier (cumulative)", () => {
    expect(hasStakeModifier("gold", "blue-discard-delta")).toBe(true);
  });
});

describe("Purple Stake — purple-ante-scaling modifier (#557)", () => {
  test("Purple Stake carries the purple-ante-scaling modifier", () => {
    expect(hasStakeModifier("purple", "purple-ante-scaling")).toBe(true);
  });

  test("Blue Stake does not carry the purple-ante-scaling modifier (negative)", () => {
    expect(hasStakeModifier("blue", "purple-ante-scaling")).toBe(false);
  });

  test("Purple is cumulative on lower tiers (still carries Green's modifier too)", () => {
    expect(hasStakeModifier("purple", "green-ante-scaling")).toBe(true);
  });
});

describe("Orange Stake — orange-perishable-roll modifier (#558)", () => {
  test("Orange Stake carries the orange-perishable-roll modifier", () => {
    expect(hasStakeModifier("orange", "orange-perishable-roll")).toBe(true);
  });

  test("Purple Stake does not carry the orange-perishable-roll modifier (negative)", () => {
    expect(hasStakeModifier("purple", "orange-perishable-roll")).toBe(false);
  });

  test("the modifier's chance defaults to ORANGE_PERISHABLE_ROLL_CHANCE", () => {
    const mod = getActiveStakeModifiers("orange").find(
      (m) => m.kind === "orange-perishable-roll",
    );
    expect(mod && "chance" in mod ? mod.chance : null).toBeCloseTo(0.3);
  });

  test("higher stakes still carry the orange-perishable-roll modifier (cumulative)", () => {
    expect(hasStakeModifier("gold", "orange-perishable-roll")).toBe(true);
  });

  test("Orange is cumulative on lower tiers (still carries Black's eternal-roll too)", () => {
    expect(hasStakeModifier("orange", "black-eternal-roll")).toBe(true);
  });
});

describe("Gold Stake — gold-rental-roll modifier (#559)", () => {
  test("Gold Stake carries the gold-rental-roll modifier", () => {
    expect(hasStakeModifier("gold", "gold-rental-roll")).toBe(true);
  });

  test("Orange Stake does not carry the gold-rental-roll modifier (negative)", () => {
    expect(hasStakeModifier("orange", "gold-rental-roll")).toBe(false);
  });

  test("the modifier's chance defaults to GOLD_RENTAL_ROLL_CHANCE (0.3)", () => {
    const mod = getActiveStakeModifiers("gold").find(
      (m) => m.kind === "gold-rental-roll",
    );
    expect(mod && "chance" in mod ? mod.chance : null).toBeCloseTo(0.3);
  });

  test("Gold inherits Orange's perishable-roll modifier (cumulative)", () => {
    expect(hasStakeModifier("gold", "orange-perishable-roll")).toBe(true);
  });

  test("Gold inherits Black's eternal-roll modifier (cumulative)", () => {
    expect(hasStakeModifier("gold", "black-eternal-roll")).toBe(true);
  });

  test("Gold inherits Blue's discard-delta modifier (cumulative)", () => {
    expect(hasStakeModifier("gold", "blue-discard-delta")).toBe(true);
  });

  test("Gold inherits Purple's ante-scaling modifier (cumulative)", () => {
    expect(hasStakeModifier("gold", "purple-ante-scaling")).toBe(true);
  });
});

describe("stakeStartingDiscardsDelta", () => {
  test("returns 0 for stakes below Blue", () => {
    expect(stakeStartingDiscardsDelta("black")).toBe(0);
  });

  test("returns -1 at Blue Stake", () => {
    expect(stakeStartingDiscardsDelta("blue")).toBe(-1);
  });

  test("returns -1 at Gold Stake too (cumulative; only Blue contributes)", () => {
    expect(stakeStartingDiscardsDelta("gold")).toBe(-1);
  });
});

describe("stakeStickerOdds", () => {
  test("returns undefined for stakes below Black", () => {
    expect(stakeStickerOdds("green")).toBeUndefined();
  });

  test("returns undefined at White Stake (regression)", () => {
    expect(stakeStickerOdds("white")).toBeUndefined();
  });

  test("returns eternal odds at Black Stake", () => {
    expect(stakeStickerOdds("black")?.eternal).toBeCloseTo(0.3);
  });

  test("does not return perishable odds at Black Stake (negative)", () => {
    expect(stakeStickerOdds("black")?.perishable).toBeUndefined();
  });

  test("returns eternal odds at Gold Stake too (cumulative)", () => {
    expect(stakeStickerOdds("gold")?.eternal).toBeCloseTo(0.3);
  });

  test("returns perishable odds at Orange Stake", () => {
    expect(stakeStickerOdds("orange")?.perishable).toBeCloseTo(0.3);
  });

  test("continues to return eternal odds at Orange Stake (cumulative with Black)", () => {
    expect(stakeStickerOdds("orange")?.eternal).toBeCloseTo(0.3);
  });

  test("returns perishable odds at Gold Stake too (cumulative)", () => {
    expect(stakeStickerOdds("gold")?.perishable).toBeCloseTo(0.3);
  });

  test("does not return rental odds at Orange Stake (negative)", () => {
    expect(stakeStickerOdds("orange")?.rental).toBeUndefined();
  });

  test("returns rental odds at Gold Stake", () => {
    expect(stakeStickerOdds("gold")?.rental).toBeCloseTo(0.3);
  });

  test("continues to return eternal odds at Gold Stake (cumulative with Black)", () => {
    expect(stakeStickerOdds("gold")?.eternal).toBeCloseTo(0.3);
  });
});
