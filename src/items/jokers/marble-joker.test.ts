// @vitest-environment node
import {
  createJokerCatalog,
  createMarbleJoker,
  stoneCardsOnBlindSelectFromJokers,
} from "../jokers";

describe("Marble Joker (#980)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("marble-joker");
  });

  test("adds one stone card per blind select", () => {
    expect(stoneCardsOnBlindSelectFromJokers([createMarbleJoker()])).toBe(1);
  });

  test("two Marble Jokers add two stones", () => {
    expect(
      stoneCardsOnBlindSelectFromJokers([
        createMarbleJoker(),
        createMarbleJoker(),
      ]),
    ).toBe(2);
  });

  test("no Marble Joker adds nothing (negative)", () => {
    expect(stoneCardsOnBlindSelectFromJokers([createJokerCatalog()[0]])).toBe(
      0,
    );
  });
});
