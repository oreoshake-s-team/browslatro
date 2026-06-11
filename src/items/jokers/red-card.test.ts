// @vitest-environment node
import {
  RED_CARD_MULT_PER_SKIPPED_PACK,
  applyHandLevelJokers,
  applyPackSkipToJokerStates,
  createJokerCatalog,
  createRedCardJoker,
} from "../jokers";
import { useGame } from "../../store/game";

describe("Red Card", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("red-card");
  });

  test("starts with state.value 0", () => {
    expect(createRedCardJoker().state).toEqual({ kind: "counter", value: 0 });
  });

  test("skipping a pack grows the counter by RED_CARD_MULT_PER_SKIPPED_PACK", () => {
    const [updated] = applyPackSkipToJokerStates([createRedCardJoker()]);
    expect(updated.state).toEqual({
      kind: "counter",
      value: RED_CARD_MULT_PER_SKIPPED_PACK,
    });
  });

  test("scoring adds the accumulated counter as additive mult", () => {
    const jokers = applyPackSkipToJokerStates([createRedCardJoker()]);
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "Pair" });
    expect(result.additiveMult).toBe(RED_CARD_MULT_PER_SKIPPED_PACK);
  });

  test("contributes no mult before any skip (negative)", () => {
    const result = applyHandLevelJokers([createRedCardJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.additiveMult).toBe(0);
  });

  test("pack skips do not touch other jokers' states (negative)", () => {
    const other = createJokerCatalog().find((j) => j.id === "flash-card");
    if (!other) throw new Error("flash-card missing from catalog");
    const [updated] = applyPackSkipToJokerStates([other]);
    expect(updated.state).toEqual(other.state);
  });

  test("the closeOpenedPack store action grows an equipped Red Card", () => {
    useGame.getState().resetGame();
    const game = useGame.getState();
    game.setJokers([createRedCardJoker()]);
    game.closeOpenedPack();
    expect(useGame.getState().jokers[0].state).toEqual({
      kind: "counter",
      value: RED_CARD_MULT_PER_SKIPPED_PACK,
    });
  });
});
