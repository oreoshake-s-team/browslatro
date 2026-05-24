import {
  calculateInterest,
  INTEREST_CAP,
  INTEREST_RATE_PER,
} from "./payout";

describe("calculateInterest", () => {
  test("returns 0 when wallet is empty", () => {
    expect(calculateInterest(0)).toBe(0);
  });

  test("returns 0 when wallet is below the per-interest threshold", () => {
    expect(calculateInterest(INTEREST_RATE_PER - 1)).toBe(0);
  });

  test("pays $1 for each full INTEREST_RATE_PER held under the cap", () => {
    expect(calculateInterest(INTEREST_RATE_PER * 3)).toBe(3);
  });

  test("pays exactly INTEREST_CAP when wallet equals the cap threshold", () => {
    expect(calculateInterest(INTEREST_RATE_PER * INTEREST_CAP)).toBe(
      INTEREST_CAP,
    );
  });

  test("caps interest at INTEREST_CAP when wallet exceeds the cap threshold", () => {
    expect(calculateInterest(INTEREST_RATE_PER * INTEREST_CAP + 100)).toBe(
      INTEREST_CAP,
    );
  });

  test("treats a negative wallet as 0 interest", () => {
    expect(calculateInterest(-10)).toBe(0);
  });

  test("INTEREST_RATE_PER is defined as 5", () => {
    expect(INTEREST_RATE_PER).toBe(5);
  });

  test("INTEREST_CAP is defined as 5", () => {
    expect(INTEREST_CAP).toBe(5);
  });
});
