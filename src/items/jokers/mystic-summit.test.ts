// @vitest-environment node
import {
  MYSTIC_SUMMIT_MULT,
  applyHandLevelJokers,
  createMysticSummitJoker,
} from "../jokers";

describe("Mystic Summit", () => {
  test("adds MYSTIC_SUMMIT_MULT when no discards remain", () => {
    const result = applyHandLevelJokers([createMysticSummitJoker()], {
      remainingDiscards: 0,
    });
    expect(result.additiveMult).toBe(MYSTIC_SUMMIT_MULT);
  });

  test("fires when no discards remain", () => {
    const result = applyHandLevelJokers([createMysticSummitJoker()], {
      remainingDiscards: 0,
    });
    expect(result.firedJokerIds).toEqual(["mystic-summit"]);
  });

  test("does not add mult when discards remain", () => {
    const result = applyHandLevelJokers([createMysticSummitJoker()], {
      remainingDiscards: 1,
    });
    expect(result.additiveMult).toBe(0);
  });

  test("does not add mult when remainingDiscards is missing from context", () => {
    const result = applyHandLevelJokers([createMysticSummitJoker()], {});
    expect(result.additiveMult).toBe(0);
  });
});
