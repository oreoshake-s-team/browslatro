// @vitest-environment node
import { createDietColaJoker, createJokerCatalog } from "../jokers";
import { useGame } from "../../store/game";

beforeEach(() => {
  useGame.getState().resetGame();
});

describe("Diet Cola (#903)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("diet-cola");
  });

  test("selling it grants a Double Tag", () => {
    const game = useGame.getState();
    game.setJokers([createDietColaJoker()]);
    game.setPendingTags([]);
    game.sellJoker(0);
    expect(useGame.getState().pendingTags).toContain("double");
  });

  test("selling it removes the joker", () => {
    const game = useGame.getState();
    game.setJokers([createDietColaJoker()]);
    game.sellJoker(0);
    expect(useGame.getState().jokers).toHaveLength(0);
  });

  test("selling a different joker grants no tag (negative)", () => {
    const game = useGame.getState();
    game.setJokers([createJokerCatalog()[0]]);
    game.setPendingTags([]);
    game.sellJoker(0);
    expect(useGame.getState().pendingTags).toHaveLength(0);
  });
});
