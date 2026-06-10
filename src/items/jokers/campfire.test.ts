// @vitest-environment node
import {
  CAMPFIRE_X_MULT_PER_SOLD_CARD,
  applyHandLevelJokers,
  applyRoundEndToJokerStates,
  applySellToJokerStates,
  createCampfireJoker,
  createJokerCatalog,
} from "../jokers";
import { useGame } from "../../store/game";

describe("Campfire (#894)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("campfire");
  });

  test("one sold card gives X1.25 Mult", () => {
    const jokers = applySellToJokerStates([createCampfireJoker()]);
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "Pair" });
    expect(result.xMult).toBe(1 + CAMPFIRE_X_MULT_PER_SOLD_CARD);
  });

  test("four sold cards give X2 Mult", () => {
    let jokers = [createCampfireJoker()];
    for (let i = 0; i < 4; i += 1) jokers = applySellToJokerStates(jokers);
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "Pair" });
    expect(result.xMult).toBe(1 + 4 * CAMPFIRE_X_MULT_PER_SOLD_CARD);
  });

  test("a non-boss round end keeps the counter (negative)", () => {
    const grown = applySellToJokerStates([createCampfireJoker()]);
    const [after] = applyRoundEndToJokerStates(grown, () => 0.99, false);
    expect(after.state).toEqual({ kind: "counter", value: 1 });
  });

  test("defeating a Boss Blind resets the counter", () => {
    const grown = applySellToJokerStates([createCampfireJoker()]);
    const [after] = applyRoundEndToJokerStates(grown, () => 0.99, true);
    expect(after.state).toEqual({ kind: "counter", value: 0 });
  });

  test("contributes nothing before any sale (negative)", () => {
    const result = applyHandLevelJokers([createCampfireJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.xMult).toBe(1);
  });

  test("selling a consumable through the store grows an equipped Campfire", () => {
    useGame.getState().resetGame();
    const game = useGame.getState();
    game.setJokers([createCampfireJoker()]);
    game.setConsumables([
      { kind: "tarot", card: { id: "the-fool", name: "The Fool", description: "", effect: { kind: "copy-last-consumable" } } },
    ]);
    game.sellConsumable(0);
    expect(useGame.getState().jokers[0].state).toEqual({
      kind: "counter",
      value: 1,
    });
  });

  test("selling another joker through the store grows an equipped Campfire", () => {
    useGame.getState().resetGame();
    const game = useGame.getState();
    const other = createJokerCatalog()[0];
    game.setJokers([other, createCampfireJoker()]);
    game.sellJoker(0);
    expect(useGame.getState().jokers[0].state).toEqual({
      kind: "counter",
      value: 1,
    });
  });
});
