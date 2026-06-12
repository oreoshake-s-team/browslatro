// @vitest-environment node
import { createPlusFourMultJoker } from "./factories";
import { createBossCatalog } from "../bosses";
import { useGame } from "../../store/game";

function verdantLeaf() {
  return createBossCatalog().find((b) => b.id === "verdant-leaf")!;
}

beforeEach(() => {
  useGame.getState().resetGame();
});

describe("Verdant Leaf — sell a Joker to lift the debuff", () => {
  test("selling any Joker during the Boss Blind clears the debuff effect", () => {
    const game = useGame.getState();
    game.setJokers([createPlusFourMultJoker()]);
    game.setCurrentBoss(verdantLeaf());
    game.setBlind(3);
    game.sellJoker(0);
    expect(useGame.getState().currentBoss.effect.kind).toBe("none");
  });

  test("selling a Joker outside the Boss Blind leaves the debuff intact (negative)", () => {
    const game = useGame.getState();
    game.setJokers([createPlusFourMultJoker()]);
    game.setCurrentBoss(verdantLeaf());
    game.setBlind(1);
    game.sellJoker(0);
    expect(useGame.getState().currentBoss.effect.kind).toBe(
      "debuff-all-until-joker-sold",
    );
  });
});
