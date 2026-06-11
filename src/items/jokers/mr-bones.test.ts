// @vitest-environment node
import {
  canPreventDeath,
  consumeDeathPreventer,
  createJokerCatalog,
  createMrBonesJoker,
} from "../jokers";
import type { Joker } from "../jokers";

describe("Mr. Bones", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("mr-bones");
  });

  test("saves at exactly 25% of the required score", () => {
    expect(canPreventDeath([createMrBonesJoker()], 250, 1000)).toBe(true);
  });

  test("does not save below 25% (negative)", () => {
    expect(canPreventDeath([createMrBonesJoker()], 249, 1000)).toBe(false);
  });

  test("unrelated jokers never save (negative)", () => {
    expect(canPreventDeath([createJokerCatalog()[0]], 999, 1000)).toBe(false);
  });

  test("the save consumes Mr. Bones", () => {
    expect(consumeDeathPreventer([createMrBonesJoker()])).toHaveLength(0);
  });

  test("an eternal Mr. Bones survives its save", () => {
    const eternal: Joker = {
      ...createMrBonesJoker(),
      stickers: [{ kind: "eternal" }],
    };
    expect(consumeDeathPreventer([eternal])).toHaveLength(1);
  });

  test("consuming leaves other jokers untouched (negative)", () => {
    const other = createJokerCatalog()[0];
    const remaining = consumeDeathPreventer([createMrBonesJoker(), other]);
    expect(remaining.map((j) => j.id)).toEqual([other.id]);
  });
});
