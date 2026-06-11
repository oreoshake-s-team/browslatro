// @vitest-environment node
import {
  createBlueprintJoker,
  createBrainstormJoker,
  createJokerCatalog,
  createMarbleJoker,
  stoneCardsOnBlindSelectFromJokers,
} from "../jokers";

describe("Marble Joker", () => {
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

  test("Blueprint copying Marble Joker adds a second stone card on blind select", () => {
    expect(
      stoneCardsOnBlindSelectFromJokers([createBlueprintJoker(), createMarbleJoker()]),
    ).toBe(2);
  });

  test("Brainstorm copying Marble Joker adds a second stone card on blind select", () => {
    expect(
      stoneCardsOnBlindSelectFromJokers([createMarbleJoker(), createBrainstormJoker()]),
    ).toBe(2);
  });

  test("Blueprint with no right neighbor contributes nothing (negative)", () => {
    expect(
      stoneCardsOnBlindSelectFromJokers([createMarbleJoker(), createBlueprintJoker()]),
    ).toBe(1);
  });
});
