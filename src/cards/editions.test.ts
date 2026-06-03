// @vitest-environment node
import {
  CARD_EDITION_INFO,
  CARD_EDITION_KINDS,
  applyCardEdition,
  withCardEdition,
} from "./editions";
import { FOIL_CHIPS, HOLOGRAPHIC_MULT, POLYCHROME_X_MULT } from "../items/jokers";
import type { Card } from "./types";

function baseCard(): Card {
  return { id: 1, rank: "A", suit: "spades" };
}

describe("CARD_EDITION_KINDS", () => {
  test("lists the three Balatro playing-card editions", () => {
    expect(CARD_EDITION_KINDS).toEqual(["foil", "holographic", "polychrome"]);
  });

  test("does not include the joker-only negative edition (negative)", () => {
    expect(CARD_EDITION_KINDS).not.toContain("negative");
  });
});

describe("CARD_EDITION_INFO", () => {
  test("Foil description mentions the foil chip bonus", () => {
    expect(CARD_EDITION_INFO.foil.description).toContain(`${FOIL_CHIPS}`);
  });

  test("Holographic description mentions the holographic mult bonus", () => {
    expect(CARD_EDITION_INFO.holographic.description).toContain(`${HOLOGRAPHIC_MULT}`);
  });

  test("Polychrome description mentions the polychrome xMult factor", () => {
    expect(CARD_EDITION_INFO.polychrome.description).toContain(`${POLYCHROME_X_MULT}`);
  });
});

describe("withCardEdition", () => {
  test("sets the edition on a card without mutating the original", () => {
    const original = baseCard();
    const updated = withCardEdition(original, "foil");
    expect(updated.edition).toBe("foil");
  });

  test("leaves the original card unchanged (negative)", () => {
    const original = baseCard();
    withCardEdition(original, "foil");
    expect(original.edition).toBeUndefined();
  });

  test("overrides a previously set edition", () => {
    const updated = withCardEdition(withCardEdition(baseCard(), "foil"), "polychrome");
    expect(updated.edition).toBe("polychrome");
  });
});

describe("applyCardEdition", () => {
  test("returns null when the card has no edition (negative)", () => {
    expect(applyCardEdition(baseCard())).toBeNull();
  });

  test("returns null when the card edition is null (negative)", () => {
    expect(applyCardEdition({ ...baseCard(), edition: null })).toBeNull();
  });

  test("foil contributes the foil chip bonus", () => {
    expect(applyCardEdition({ ...baseCard(), edition: "foil" })?.additiveChips).toBe(
      FOIL_CHIPS,
    );
  });

  test("foil contributes no mult bonus (negative)", () => {
    expect(applyCardEdition({ ...baseCard(), edition: "foil" })?.additiveMult).toBe(0);
  });

  test("foil leaves xMult at 1 (negative)", () => {
    expect(applyCardEdition({ ...baseCard(), edition: "foil" })?.xMult).toBe(1);
  });

  test("holographic contributes the holographic mult bonus", () => {
    expect(
      applyCardEdition({ ...baseCard(), edition: "holographic" })?.additiveMult,
    ).toBe(HOLOGRAPHIC_MULT);
  });

  test("holographic contributes no chip bonus (negative)", () => {
    expect(
      applyCardEdition({ ...baseCard(), edition: "holographic" })?.additiveChips,
    ).toBe(0);
  });

  test("polychrome contributes the polychrome xMult factor", () => {
    expect(applyCardEdition({ ...baseCard(), edition: "polychrome" })?.xMult).toBe(
      POLYCHROME_X_MULT,
    );
  });

  test("polychrome contributes no additive chips (negative)", () => {
    expect(
      applyCardEdition({ ...baseCard(), edition: "polychrome" })?.additiveChips,
    ).toBe(0);
  });
});
