import { describe, expect, test } from "vitest";
import { idolDescriptionText } from "./idolDescription";

describe("idolDescriptionText", () => {
  test("substitutes rank and suit when both are provided", () => {
    expect(idolDescriptionText("Each played [rank] of [suit] gives X2 Mult when scored", "A", "Spades")).toBe(
      "Each played A of Spades gives X2 Mult when scored",
    );
  });

  test("returns the base string unchanged when rank is null", () => {
    expect(idolDescriptionText("Each played [rank] of [suit] gives X2 Mult when scored", null, "Spades")).toBe(
      "Each played [rank] of [suit] gives X2 Mult when scored",
    );
  });

  test("returns the base string unchanged when suit is null (negative)", () => {
    expect(idolDescriptionText("Each played [rank] of [suit] gives X2 Mult when scored", "A", null)).toBe(
      "Each played [rank] of [suit] gives X2 Mult when scored",
    );
  });

  test("returns the base string unchanged when both are null (negative)", () => {
    expect(idolDescriptionText("Each played [rank] of [suit] gives X2 Mult when scored", null, null)).toBe(
      "Each played [rank] of [suit] gives X2 Mult when scored",
    );
  });

  test("works with numeric ranks", () => {
    expect(idolDescriptionText("Each played [rank] of [suit] gives X2 Mult when scored", "10", "Hearts")).toBe(
      "Each played 10 of Hearts gives X2 Mult when scored",
    );
  });
});
