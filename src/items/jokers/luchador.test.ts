// @vitest-environment node
import { createJokerCatalog, createLuchadorJoker } from "../jokers";
import { createBossCatalog } from "../bosses";
import { useGame } from "../../store/game";

function bossWithEffect() {
  const boss = createBossCatalog().find((b) => b.effect.kind !== "none");
  if (!boss) throw new Error("no boss with an effect in the catalog");
  return boss;
}

beforeEach(() => {
  useGame.getState().resetGame();
});

describe("Luchador (#1000)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("luchador");
  });

  test("selling it during a Boss Blind disables the boss effect", () => {
    const game = useGame.getState();
    game.setJokers([createLuchadorJoker()]);
    game.setCurrentBoss(bossWithEffect());
    game.setBlind(3);
    game.sellJoker(0);
    expect(useGame.getState().currentBoss.effect.kind).toBe("none");
  });

  test("selling it outside a Boss Blind leaves the boss intact (negative)", () => {
    const boss = bossWithEffect();
    const game = useGame.getState();
    game.setJokers([createLuchadorJoker()]);
    game.setCurrentBoss(boss);
    game.setBlind(1);
    game.sellJoker(0);
    expect(useGame.getState().currentBoss.effect.kind).toBe(boss.effect.kind);
  });

  test("the sale removes the joker", () => {
    const game = useGame.getState();
    game.setJokers([createLuchadorJoker()]);
    game.setBlind(3);
    game.sellJoker(0);
    expect(useGame.getState().jokers).toHaveLength(0);
  });
});
