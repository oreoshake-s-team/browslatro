import { formatChanceRatio, getCardInfo } from "./cardInfo";
import type { Card } from "../../cards/types";

const luckyCard: Card = { id: 1, rank: "A", suit: "clubs", enhancement: "lucky" };
const glassCard: Card = { id: 2, rank: "Q", suit: "diamonds", enhancement: "glass" };

describe("formatChanceRatio", () => {
  test("formats 1-in-N when multiplier is 1 (identity)", () => {
    expect(formatChanceRatio(0.2)).toBe("1-in-5");
  });

  test("doubles the numerator when the multiplier is 2", () => {
    expect(formatChanceRatio(0.2, 2)).toBe("2-in-5");
  });

  test("renders 'guaranteed' once the effective chance reaches 1", () => {
    expect(formatChanceRatio(0.5, 2)).toBe("guaranteed");
  });

  test("renders 'guaranteed' when the base chance is already 1", () => {
    expect(formatChanceRatio(1)).toBe("guaranteed");
  });

  test("treats a zero multiplier as identity (defensive)", () => {
    expect(formatChanceRatio(0.2, 0)).toBe("1-in-5");
  });
});

describe("getCardInfo — lucky enhancement description", () => {
  test("exposes a card's accumulated bonus chips", () => {
    expect(
      getCardInfo({ id: 51, rank: "9", suit: "spades", bonusChips: 10 })
        .bonusChips,
    ).toBe(10);
  });

  test("defaults bonus chips to zero when unset (negative)", () => {
    expect(getCardInfo({ id: 52, rank: "9", suit: "spades" }).bonusChips).toBe(
      0,
    );
  });

  test("shows 1-in-5 / 1-in-15 by default (no probability multiplier)", () => {
    expect(getCardInfo(luckyCard).enhancement?.description).toContain("1-in-5");
  });

  test("shows the money-hit ratio (1-in-15) by default too", () => {
    expect(getCardInfo(luckyCard).enhancement?.description).toContain("1-in-15");
  });

  test("doubles the lucky mult-hit ratio when probabilityMultiplier is 2", () => {
    const info = getCardInfo(luckyCard, { probabilityMultiplier: 2 });
    expect(info.enhancement?.description).toContain("2-in-5");
  });

  test("doubles the lucky money-hit ratio when probabilityMultiplier is 2", () => {
    const info = getCardInfo(luckyCard, { probabilityMultiplier: 2 });
    expect(info.enhancement?.description).toContain("2-in-15");
  });

  test("ignores a multiplier of exactly 1 (no description change)", () => {
    const def = getCardInfo(luckyCard);
    const one = getCardInfo(luckyCard, { probabilityMultiplier: 1 });
    expect(one.enhancement?.description).toBe(def.enhancement?.description);
  });
});

describe("getCardInfo — glass enhancement description", () => {
  test("shows 1-in-4 break chance by default", () => {
    expect(getCardInfo(glassCard).enhancement?.description).toContain("1-in-4");
  });

  test("doubles the break-chance ratio when probabilityMultiplier is 2", () => {
    const info = getCardInfo(glassCard, { probabilityMultiplier: 2 });
    expect(info.enhancement?.description).toContain("2-in-4");
  });
});
