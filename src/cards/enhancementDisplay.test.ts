import { describe, expect, test } from "vitest";
import { enhancementDisplayValue } from "./enhancementDisplay";

describe("enhancementDisplayValue", () => {
  test("bonus maps to +30 with the chips color token", () => {
    expect(enhancementDisplayValue("bonus")).toEqual({
      text: "+30",
      color: "chips",
      timing: "scored",
    });
  });

  test("mult maps to +4 with the mult color token", () => {
    expect(enhancementDisplayValue("mult")).toEqual({
      text: "+4",
      color: "mult",
      timing: "scored",
    });
  });

  test("glass maps to ×2 with the mult color token", () => {
    expect(enhancementDisplayValue("glass")).toEqual({
      text: "×2",
      color: "mult",
      timing: "scored",
    });
  });

  test("steel maps to ×1.5 with the mult color token", () => {
    expect(enhancementDisplayValue("steel")).toEqual({
      text: "×1.5",
      color: "mult",
      timing: "heldInHand",
    });
  });

  test("gold maps to +$3 with the money color token", () => {
    expect(enhancementDisplayValue("gold")).toEqual({
      text: "+$3",
      color: "money",
      timing: "heldAtEndOfRound",
    });
  });

  test("wild has no display value", () => {
    expect(enhancementDisplayValue("wild")).toBeNull();
  });

  test("stone has no display value", () => {
    expect(enhancementDisplayValue("stone")).toBeNull();
  });

  test("lucky has no flat display value", () => {
    expect(enhancementDisplayValue("lucky")).toBeNull();
  });
});
