// @vitest-environment node
import { describe, expect, test } from "vitest";
import { baseChipsForAnte, requiredChipsForBlind } from "./anteScaling";
import { BASE_CHIPS, GREEN_STAKE_CHIPS } from "../constants";
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

  test("Green is cumulative on Gold stake (highest tier)", () => {
    expect(baseChipsForAnte(8, "gold")).toBe(GREEN_STAKE_CHIPS[7]);
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
