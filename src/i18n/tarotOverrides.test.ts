import { localizedTarotDescription, localizedTarotName } from "./tarotOverrides";

describe("tarotOverrides", () => {
  test("localizedTarotName returns the canonical i18n name, not the code fallback", () => {
    expect(localizedTarotName("en", "the-hermit", "The Hermit (fallback)")).toBe(
      "The Hermit",
    );
  });

  test("localizedTarotName returns the fallback for an unknown id", () => {
    expect(localizedTarotName("en", "not-a-tarot", "Fallback")).toBe("Fallback");
  });

  test("localizedTarotDescription returns the canonical en description", () => {
    expect(localizedTarotDescription("en", "judgement", "fallback")).toBe(
      "Create a random Joker",
    );
  });

  test("localizedTarotDescription returns the fallback for an unknown id", () => {
    expect(localizedTarotDescription("en", "not-a-tarot", "Fallback")).toBe("Fallback");
  });

  test("an untranslated haw tarot name falls back to the English text", () => {
    expect(localizedTarotName("haw", "the-hermit", "The Hermit")).toBe("The Hermit");
  });

  test("an untranslated haw tarot description falls back to the English text", () => {
    expect(localizedTarotDescription("haw", "judgement", "fallback")).toBe(
      "Create a random Joker",
    );
  });
});
