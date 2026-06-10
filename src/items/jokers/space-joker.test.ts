// @vitest-environment node
import {
  SPACE_JOKER_UPGRADE_CHANCE,
  createJokerCatalog,
  createSpaceJoker,
  handPlayUpgradeRolls,
} from "../jokers";

function fixedRng(values: ReadonlyArray<number>): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe("Space Joker (#1039)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("space-joker");
  });

  test("upgrades with a 1 in 4 chance", () => {
    expect(SPACE_JOKER_UPGRADE_CHANCE).toBe(0.25);
  });

  test("a winning roll upgrades the played hand", () => {
    const rolls = handPlayUpgradeRolls([createSpaceJoker()], fixedRng([0]));
    expect(rolls).toBe(1);
  });

  test("two Space Jokers can each win their roll", () => {
    const rolls = handPlayUpgradeRolls(
      [createSpaceJoker(), createSpaceJoker()],
      fixedRng([0, 0]),
    );
    expect(rolls).toBe(2);
  });

  test("a losing roll upgrades nothing (negative)", () => {
    const rolls = handPlayUpgradeRolls([createSpaceJoker()], fixedRng([0.9]));
    expect(rolls).toBe(0);
  });

  test("without Space Joker nothing is rolled (negative)", () => {
    const rolls = handPlayUpgradeRolls(
      createJokerCatalog().slice(0, 1),
      fixedRng([0]),
    );
    expect(rolls).toBe(0);
  });
});
