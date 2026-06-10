// @vitest-environment node
import {
  CEREMONIAL_DAGGER_SELL_VALUE_MULTIPLIER,
  applyCeremonialDaggerOnBlindSelect,
  applyHandLevelJokers,
  createCeremonialDaggerJoker,
  createJokerCatalog,
  jokerSellValue,
} from "../jokers";
import type { Joker } from "../jokers";

function eternal(joker: Joker): Joker {
  return { ...joker, stickers: [{ kind: "eternal" }] };
}

describe("Ceremonial Dagger (#1039)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("ceremonial-dagger");
  });

  test("destroys the joker to its right on blind select", () => {
    const other = createJokerCatalog()[0];
    const result = applyCeremonialDaggerOnBlindSelect([
      createCeremonialDaggerJoker(),
      other,
    ]);
    expect(result.map((j) => j.id)).toEqual(["ceremonial-dagger"]);
  });

  test("gains double the victim's sell value as Mult", () => {
    const other = createJokerCatalog()[0];
    const result = applyCeremonialDaggerOnBlindSelect([
      createCeremonialDaggerJoker(),
      other,
    ]);
    expect(applyHandLevelJokers(result).additiveMult).toBe(
      CEREMONIAL_DAGGER_SELL_VALUE_MULTIPLIER * jokerSellValue(other),
    );
  });

  test("the gain compounds across blinds", () => {
    const [a, b] = createJokerCatalog().slice(0, 2);
    const afterFirst = applyCeremonialDaggerOnBlindSelect([
      createCeremonialDaggerJoker(),
      a,
    ]);
    const afterSecond = applyCeremonialDaggerOnBlindSelect([...afterFirst, b]);
    expect(applyHandLevelJokers(afterSecond).additiveMult).toBe(
      CEREMONIAL_DAGGER_SELL_VALUE_MULTIPLIER *
        (jokerSellValue(a) + jokerSellValue(b)),
    );
  });

  test("a joker left of the dagger survives", () => {
    const other = createJokerCatalog()[0];
    const result = applyCeremonialDaggerOnBlindSelect([
      other,
      createCeremonialDaggerJoker(),
    ]);
    expect(result.map((j) => j.id)).toEqual([other.id, "ceremonial-dagger"]);
  });

  test("gains nothing when rightmost (negative)", () => {
    const result = applyCeremonialDaggerOnBlindSelect([
      createCeremonialDaggerJoker(),
    ]);
    expect(result[0].state).toEqual({ kind: "counter", value: 0 });
  });

  test("does not destroy an eternal neighbour (negative)", () => {
    const other = eternal(createJokerCatalog()[0]);
    const result = applyCeremonialDaggerOnBlindSelect([
      createCeremonialDaggerJoker(),
      other,
    ]);
    expect(result.map((j) => j.id)).toEqual([
      "ceremonial-dagger",
      other.id,
    ]);
  });

  test("without a dagger the row is untouched (negative)", () => {
    const others = createJokerCatalog().slice(0, 2);
    const result = applyCeremonialDaggerOnBlindSelect(others);
    expect(result.map((j) => j.id)).toEqual(others.map((j) => j.id));
  });
});
