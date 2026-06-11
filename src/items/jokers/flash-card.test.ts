// @vitest-environment node
import {
  FLASH_CARD_MULT_PER_REROLL,
  applyHandLevelJokers,
  applyShopRerollToJokerStates,
  createFlashCardJoker,
  createJokerCatalog,
} from "../jokers";
import { useGame } from "../../store/game";

describe("Flash Card", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("flash-card");
  });

  test("starts with state.value 0", () => {
    expect(createFlashCardJoker().state).toEqual({ kind: "counter", value: 0 });
  });

  test("a shop reroll grows the counter by FLASH_CARD_MULT_PER_REROLL", () => {
    const [updated] = applyShopRerollToJokerStates([createFlashCardJoker()]);
    expect(updated.state).toEqual({
      kind: "counter",
      value: FLASH_CARD_MULT_PER_REROLL,
    });
  });

  test("two rerolls stack the counter", () => {
    const [updated] = applyShopRerollToJokerStates(
      applyShopRerollToJokerStates([createFlashCardJoker()]),
    );
    expect(updated.state).toEqual({
      kind: "counter",
      value: 2 * FLASH_CARD_MULT_PER_REROLL,
    });
  });

  test("scoring adds the accumulated counter as additive mult", () => {
    const jokers = applyShopRerollToJokerStates([createFlashCardJoker()]);
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "Pair" });
    expect(result.additiveMult).toBe(FLASH_CARD_MULT_PER_REROLL);
  });

  test("contributes no mult before any reroll (negative)", () => {
    const result = applyHandLevelJokers([createFlashCardJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.additiveMult).toBe(0);
  });

  test("rerolls do not touch other jokers' states (negative)", () => {
    const other = createJokerCatalog().find((j) => j.id === "green-joker");
    if (!other) throw new Error("green-joker missing from catalog");
    const [updated] = applyShopRerollToJokerStates([other]);
    expect(updated.state).toEqual(other.state);
  });

  test("the rerollShopOffers store action grows an equipped Flash Card", () => {
    useGame.getState().resetGame();
    const game = useGame.getState();
    game.setJokers([createFlashCardJoker()]);
    game.setShopOffers([]);
    game.setMoney(20);
    game.rerollShopOffers(5);
    expect(useGame.getState().jokers[0].state).toEqual({
      kind: "counter",
      value: FLASH_CARD_MULT_PER_REROLL,
    });
  });
});
