// @vitest-environment node
import {
  ROCKET_BASE_PAYOUT,
  ROCKET_PAYOUT_GROWTH_PER_BOSS,
  applyEndOfRoundJokers,
  applyRoundEndToJokerStates,
  createJokerCatalog,
  createRocketJoker,
} from "../jokers";

describe("Rocket", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("rocket");
  });

  test("pays its base amount at end of round", () => {
    const result = applyEndOfRoundJokers([createRocketJoker()]);
    expect(result.moneyEarned).toBe(ROCKET_BASE_PAYOUT);
  });

  test("defeating a Boss Blind grows the payout", () => {
    const [grown] = applyRoundEndToJokerStates(
      [createRocketJoker()],
      () => 0.99,
      true,
    );
    const result = applyEndOfRoundJokers([grown]);
    expect(result.moneyEarned).toBe(
      ROCKET_BASE_PAYOUT + ROCKET_PAYOUT_GROWTH_PER_BOSS,
    );
  });

  test("a non-boss round end does not grow the payout (negative)", () => {
    const [after] = applyRoundEndToJokerStates(
      [createRocketJoker()],
      () => 0.99,
      false,
    );
    const result = applyEndOfRoundJokers([after]);
    expect(result.moneyEarned).toBe(ROCKET_BASE_PAYOUT);
  });

  test("growth compounds over multiple boss defeats", () => {
    let jokers = [createRocketJoker()];
    jokers = applyRoundEndToJokerStates(jokers, () => 0.99, true);
    jokers = applyRoundEndToJokerStates(jokers, () => 0.99, true);
    const result = applyEndOfRoundJokers(jokers);
    expect(result.moneyEarned).toBe(
      ROCKET_BASE_PAYOUT + 2 * ROCKET_PAYOUT_GROWTH_PER_BOSS,
    );
  });
});
