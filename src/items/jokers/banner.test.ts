// @vitest-environment node
import {
  BANNER_CHIPS_PER_DISCARD,
  applyHandLevelJokers,
  createBannerJoker,
} from "../jokers";

describe("Banner", () => {
  test("adds BANNER_CHIPS_PER_DISCARD per remaining discard", () => {
    const result = applyHandLevelJokers([createBannerJoker()], {
      remainingDiscards: 3,
    });
    expect(result.additiveChips).toBe(BANNER_CHIPS_PER_DISCARD * 3);
  });

  test("adds BANNER_CHIPS_PER_DISCARD for a single remaining discard", () => {
    const result = applyHandLevelJokers([createBannerJoker()], {
      remainingDiscards: 1,
    });
    expect(result.additiveChips).toBe(BANNER_CHIPS_PER_DISCARD);
  });

  test("contributes no chips when no discards remain", () => {
    const result = applyHandLevelJokers([createBannerJoker()], {
      remainingDiscards: 0,
    });
    expect(result.additiveChips).toBe(0);
  });

  test("does not fire when no discards remain", () => {
    const result = applyHandLevelJokers([createBannerJoker()], {
      remainingDiscards: 0,
    });
    expect(result.firedJokerIds).toEqual([]);
  });

  test("contributes no chips when remainingDiscards is missing from context", () => {
    const result = applyHandLevelJokers([createBannerJoker()], {});
    expect(result.additiveChips).toBe(0);
  });

  test("fires when at least one discard remains", () => {
    const result = applyHandLevelJokers([createBannerJoker()], {
      remainingDiscards: 2,
    });
    expect(result.firedJokerIds).toEqual(["banner"]);
  });
});
