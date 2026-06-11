// @vitest-environment node
import {
  VAGABOND_MONEY_THRESHOLD,
  consumableCreationsOnHandPlayed,
  createJokerCatalog,
  createVagabondJoker,
} from "../jokers";

const baseCtx = {
  playedHandLabel: "Pair",
  playedCards: [],
  scoredCards: [],
  isFirstHandOfRound: false,
} as const;

describe("Vagabond", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("vagabond");
  });

  test("creates a tarot at exactly the $4 threshold", () => {
    const result = consumableCreationsOnHandPlayed([createVagabondJoker()], {
      ...baseCtx,
      money: VAGABOND_MONEY_THRESHOLD,
    });
    expect(result.tarots).toBe(1);
  });

  test("creates a tarot when broke", () => {
    const result = consumableCreationsOnHandPlayed([createVagabondJoker()], {
      ...baseCtx,
      money: 0,
    });
    expect(result.tarots).toBe(1);
  });

  test("creates nothing above the threshold (negative)", () => {
    const result = consumableCreationsOnHandPlayed([createVagabondJoker()], {
      ...baseCtx,
      money: VAGABOND_MONEY_THRESHOLD + 1,
    });
    expect(result.tarots).toBe(0);
  });
});
