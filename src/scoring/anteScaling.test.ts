// @vitest-environment node
import { describe, expect, test } from "vitest";
import { baseChipsForAnte, requiredChipsForBlind } from "./anteScaling";
import {
  BASE_CHIPS,
  GREEN_STAKE_CHIPS,
  PURPLE_STAKE_CHIPS,
} from "../constants";
import type { BossBlind } from "../items/bosses";

const TEST_BOSS: BossBlind = {
  id: "test-boss",
  name: "Test Boss",
  description: "",
  scoreMultiplier: 2,
  anteMin: 1,
  effect: { kind: "none" },
};

describe("baseChipsForAnte", () => {
  test("returns BASE_CHIPS when no stake is passed", () => {
    expect(baseChipsForAnte(1)).toBe(BASE_CHIPS[0]);
  });

  test("returns BASE_CHIPS for White stake", () => {
    expect(baseChipsForAnte(1, "white")).toBe(BASE_CHIPS[0]);
  });

  test("returns BASE_CHIPS for Red stake (no green modifier)", () => {
    expect(baseChipsForAnte(5, "red")).toBe(BASE_CHIPS[4]);
  });

  test("returns GREEN_STAKE_CHIPS for Green stake", () => {
    expect(baseChipsForAnte(5, "green")).toBe(GREEN_STAKE_CHIPS[4]);
  });

  test("Green ante 1 matches the published 300", () => {
    expect(baseChipsForAnte(1, "green")).toBe(300);
  });

  test("Green ante 8 matches the published 100000", () => {
    expect(baseChipsForAnte(8, "green")).toBe(100_000);
  });

  test("Green is cumulative on Black stake", () => {
    expect(baseChipsForAnte(5, "black")).toBe(GREEN_STAKE_CHIPS[4]);
  });

  test("Green is cumulative on Black stake (still below Purple)", () => {
    expect(baseChipsForAnte(8, "black")).toBe(GREEN_STAKE_CHIPS[7]);
  });
});

describe("baseChipsForAnte — endless mode", () => {
  test("ante 9 matches Balatro's published 110000", () => {
    expect(baseChipsForAnte(9)).toBe(110_000);
  });

  test("ante 10 matches Balatro's published 560000", () => {
    expect(baseChipsForAnte(10)).toBe(560_000);
  });

  test("requirements grow strictly per ante from 8 through 16", () => {
    for (let ante = 8; ante < 16; ante++) {
      expect(baseChipsForAnte(ante + 1)).toBeGreaterThan(
        baseChipsForAnte(ante),
      );
    }
  });

  test("endless scaling from the Green stake table starts above the base table", () => {
    expect(baseChipsForAnte(9, "green")).toBeGreaterThan(baseChipsForAnte(9));
  });

  test("endless scaling from the Purple stake table starts above Green", () => {
    expect(baseChipsForAnte(9, "purple")).toBeGreaterThan(
      baseChipsForAnte(9, "green"),
    );
  });

  test("blind multipliers still apply past the table", () => {
    expect(
      requiredChipsForBlind({
        ante: 9,
        blind: 2,
        boss: TEST_BOSS,
        stake: "white",
      }),
    ).toBe(baseChipsForAnte(9) * 1.5);
  });

  test("antes below 1 return the 100-chip floor", () => {
    expect(baseChipsForAnte(0)).toBe(100);
  });
});

describe("requiredChipsForBlind — White (base)", () => {
  test("Small Blind ante 1 returns BASE_CHIPS[0]", () => {
    expect(
      requiredChipsForBlind({
        ante: 1,
        blind: 1,
        boss: TEST_BOSS,
        stake: "white",
      }),
    ).toBe(BASE_CHIPS[0]);
  });

  test("Big Blind ante 2 returns BASE_CHIPS[1] * 1.5", () => {
    expect(
      requiredChipsForBlind({
        ante: 2,
        blind: 2,
        boss: TEST_BOSS,
        stake: "white",
      }),
    ).toBe(BASE_CHIPS[1] * 1.5);
  });

  test("Boss Blind applies boss.scoreMultiplier to BASE_CHIPS", () => {
    expect(
      requiredChipsForBlind({
        ante: 1,
        blind: 3,
        boss: TEST_BOSS,
        stake: "white",
      }),
    ).toBe(BASE_CHIPS[0] * TEST_BOSS.scoreMultiplier);
  });
});

describe("requiredChipsForBlind — Green stake", () => {
  test("Small Blind ante 8 returns 100000", () => {
    expect(
      requiredChipsForBlind({
        ante: 8,
        blind: 1,
        boss: TEST_BOSS,
        stake: "green",
      }),
    ).toBe(100_000);
  });

  test("Green is strictly greater than White at ante 5 (acceptance)", () => {
    const white = requiredChipsForBlind({
      ante: 5,
      blind: 1,
      boss: TEST_BOSS,
      stake: "white",
    });
    const green = requiredChipsForBlind({
      ante: 5,
      blind: 1,
      boss: TEST_BOSS,
      stake: "green",
    });
    expect(green).toBeGreaterThan(white);
  });

  test("Green / White ratio at ante 8 equals 2x (acceptance: expected ratio)", () => {
    const white = requiredChipsForBlind({
      ante: 8,
      blind: 1,
      boss: TEST_BOSS,
      stake: "white",
    });
    const green = requiredChipsForBlind({
      ante: 8,
      blind: 1,
      boss: TEST_BOSS,
      stake: "green",
    });
    expect(green / white).toBe(2);
  });

  test("Green never drops below White at lower antes (acceptance: lower-ante direction)", () => {
    for (let ante = 1; ante <= 8; ante++) {
      const white = requiredChipsForBlind({
        ante,
        blind: 1,
        boss: TEST_BOSS,
        stake: "white",
      });
      const green = requiredChipsForBlind({
        ante,
        blind: 1,
        boss: TEST_BOSS,
        stake: "green",
      });
      expect(green).toBeGreaterThanOrEqual(white);
    }
  });

  test("Green ante 1 equals White ante 1 (no penalty at the first ante)", () => {
    const white = requiredChipsForBlind({
      ante: 1,
      blind: 1,
      boss: TEST_BOSS,
      stake: "white",
    });
    const green = requiredChipsForBlind({
      ante: 1,
      blind: 1,
      boss: TEST_BOSS,
      stake: "green",
    });
    expect(green).toBe(white);
  });
});

describe("baseChipsForAnte — Purple stake", () => {
  test("returns PURPLE_STAKE_CHIPS for Purple stake", () => {
    expect(baseChipsForAnte(5, "purple")).toBe(PURPLE_STAKE_CHIPS[4]);
  });

  test("Purple ante 1 matches the published 300", () => {
    expect(baseChipsForAnte(1, "purple")).toBe(300);
  });

  test("Purple ante 8 matches the published 200000", () => {
    expect(baseChipsForAnte(8, "purple")).toBe(200_000);
  });

  test("Purple takes precedence over Green at higher tiers (cumulative)", () => {
    expect(baseChipsForAnte(5, "gold")).toBe(PURPLE_STAKE_CHIPS[4]);
  });
});

describe("requiredChipsForBlind — Purple stake", () => {
  test("Small Blind ante 8 returns 200000 (PURPLE_STAKE_CHIPS[7])", () => {
    expect(
      requiredChipsForBlind({
        ante: 8,
        blind: 1,
        boss: TEST_BOSS,
        stake: "purple",
      }),
    ).toBe(200_000);
  });

  test("Purple is strictly greater than Green at every ante from 2..8", () => {
    for (let ante = 2; ante <= 8; ante++) {
      const green = requiredChipsForBlind({
        ante,
        blind: 1,
        boss: TEST_BOSS,
        stake: "green",
      });
      const purple = requiredChipsForBlind({
        ante,
        blind: 1,
        boss: TEST_BOSS,
        stake: "purple",
      });
      expect(purple).toBeGreaterThan(green);
    }
  });

  test("Purple is strictly greater than White at every ante from 2..8", () => {
    for (let ante = 2; ante <= 8; ante++) {
      const white = requiredChipsForBlind({
        ante,
        blind: 1,
        boss: TEST_BOSS,
        stake: "white",
      });
      const purple = requiredChipsForBlind({
        ante,
        blind: 1,
        boss: TEST_BOSS,
        stake: "purple",
      });
      expect(purple).toBeGreaterThan(white);
    }
  });

  test("Purple ante 1 equals White ante 1 (no penalty at the first ante)", () => {
    const white = requiredChipsForBlind({
      ante: 1,
      blind: 1,
      boss: TEST_BOSS,
      stake: "white",
    });
    const purple = requiredChipsForBlind({
      ante: 1,
      blind: 1,
      boss: TEST_BOSS,
      stake: "purple",
    });
    expect(purple).toBe(white);
  });

  test("Green-alone (no Purple) still uses GREEN_STAKE_CHIPS at ante 5 (regression)", () => {
    expect(baseChipsForAnte(5, "green")).toBe(GREEN_STAKE_CHIPS[4]);
  });

  test("Red stake (no scaling modifiers) still uses BASE_CHIPS at ante 5 (regression)", () => {
    expect(baseChipsForAnte(5, "red")).toBe(BASE_CHIPS[4]);
  });

  test("Purple takes precedence over Green when both are active (higher wins, not additive)", () => {
    expect(baseChipsForAnte(8, "purple")).toBe(PURPLE_STAKE_CHIPS[7]);
  });
});
