import { localizedJokerDescription, localizedJokerName } from "./jokerOverrides";

describe("jokerOverrides", () => {
  test("localizedJokerName returns the canonical i18n name, not the code fallback", () => {
    expect(localizedJokerName("en", "plus-four-mult", "+4 Mult")).toBe("Joker");
  });

  test("localizedJokerName returns the fallback for an unknown id", () => {
    expect(localizedJokerName("en", "not-a-joker", "Fallback")).toBe("Fallback");
  });

  test("localizedJokerDescription interpolates the templated values", () => {
    expect(localizedJokerDescription("en", "bull", "fallback")).toBe(
      "+2 Chips for each $1 you have",
    );
  });

  test("localizedJokerDescription returns the fallback for an unknown id", () => {
    expect(localizedJokerDescription("en", "not-a-joker", "Fallback")).toBe("Fallback");
  });

  test("an untranslated haw joker name falls back to the English text", () => {
    expect(localizedJokerName("haw", "plus-four-mult", "+4 Mult")).toBe("Joker");
  });
});
