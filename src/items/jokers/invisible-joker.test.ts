// @vitest-environment node
import {
  INVISIBLE_JOKER_ROUNDS,
  applyRoundEndToJokerStates,
  createInvisibleJoker,
  createJokerCatalog,
  createLegendaryJokerCatalog,
} from "../jokers";
import type { Joker, JokerRarity } from "../jokers";
import { useGame } from "../../store/game";

function invisibleHeldForRounds(rounds: number): Joker {
  let jokers: Joker[] = [createInvisibleJoker()];
  for (let i = 0; i < rounds; i += 1) {
    jokers = applyRoundEndToJokerStates(jokers);
  }
  return jokers[0];
}

describe("Invisible Joker (#1037)", () => {
  test("is registered in the legendary pool", () => {
    const ids = createLegendaryJokerCatalog().map((j) => j.id);
    expect(ids).toContain("invisible-joker");
  });

  test("is not in the regular shop catalog (negative)", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).not.toContain("invisible-joker");
  });

  test("has legendary rarity", () => {
    expect(createInvisibleJoker().rarity).toBe<JokerRarity>("legendary");
  });

  test("the round-end pass advances the held-rounds counter", () => {
    expect(invisibleHeldForRounds(1).state).toEqual({
      kind: "counter",
      value: 1,
    });
  });

  test("selling after enough rounds duplicates a random other joker", () => {
    useGame.getState().resetGame();
    const other = createJokerCatalog()[0];
    useGame
      .getState()
      .setJokers([other, invisibleHeldForRounds(INVISIBLE_JOKER_ROUNDS)]);
    useGame.getState().sellJoker(1);
    expect(useGame.getState().jokers.map((j) => j.id)).toEqual([
      other.id,
      other.id,
    ]);
  });

  test("selling early duplicates nothing (negative)", () => {
    useGame.getState().resetGame();
    const other = createJokerCatalog()[0];
    useGame
      .getState()
      .setJokers([
        other,
        invisibleHeldForRounds(INVISIBLE_JOKER_ROUNDS - 1),
      ]);
    useGame.getState().sellJoker(1);
    expect(useGame.getState().jokers.map((j) => j.id)).toEqual([other.id]);
  });

  test("selling with no other jokers leaves an empty row (negative)", () => {
    useGame.getState().resetGame();
    useGame
      .getState()
      .setJokers([invisibleHeldForRounds(INVISIBLE_JOKER_ROUNDS)]);
    useGame.getState().sellJoker(0);
    expect(useGame.getState().jokers).toEqual([]);
  });
});
