// @vitest-environment node
import {
  GROS_MICHEL_MULT,
  applyHandLevelJokers,
  applyRoundEndToJokerStates,
  createGrosMichelJoker,
  createJokerCatalog,
} from "../jokers";
import type { Joker } from "../jokers";

describe("Gros Michel", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("gros-michel");
  });

  test("adds +15 Mult to every played hand", () => {
    const result = applyHandLevelJokers([createGrosMichelJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.additiveMult).toBe(GROS_MICHEL_MULT);
  });

  test("goes extinct at round end when the 1-in-6 roll hits", () => {
    const jokers = applyRoundEndToJokerStates(
      [createGrosMichelJoker()],
      () => 0,
    );
    expect(jokers).toHaveLength(0);
  });

  test("survives the round when the roll misses (negative)", () => {
    const jokers = applyRoundEndToJokerStates(
      [createGrosMichelJoker()],
      () => 0.99,
    );
    expect(jokers).toHaveLength(1);
  });

  test("an eternal Gros Michel survives a losing roll", () => {
    const eternal: Joker = {
      ...createGrosMichelJoker(),
      stickers: [{ kind: "eternal" }],
    };
    const jokers = applyRoundEndToJokerStates([eternal], () => 0);
    expect(jokers).toHaveLength(1);
  });

  test("extinction only removes Gros Michel, not its neighbours", () => {
    const other = createJokerCatalog().find((j) => j.id === "plus-four-mult");
    if (!other) throw new Error("plus-four-mult missing from catalog");
    const jokers = applyRoundEndToJokerStates(
      [createGrosMichelJoker(), other],
      () => 0,
    );
    expect(jokers.map((j) => j.id)).toEqual(["plus-four-mult"]);
  });
});
