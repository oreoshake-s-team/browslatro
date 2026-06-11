// @vitest-environment node
import {
  applyHandLevelJokers,
  createJokerCatalog,
  createSupernovaJoker,
} from "../jokers";
import { emptyHandCounts } from "../../components/hud/handPlayCounts";

describe("Supernova joker", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("supernova");
  });

  test("contributes 0 mult when the played hand has never been played", () => {
    const counts = { ...emptyHandCounts(), "High Card": 0 };
    const result = applyHandLevelJokers([createSupernovaJoker()], {
      playedHandLabel: "High Card",
      handPlayCounts: counts,
    });
    expect(result.additiveMult).toBe(0);
  });

  test("adds +N mult equal to handPlayCounts[playedHand]", () => {
    const counts = { ...emptyHandCounts(), Pair: 4 };
    const result = applyHandLevelJokers([createSupernovaJoker()], {
      playedHandLabel: "Pair",
      handPlayCounts: counts,
    });
    expect(result.additiveMult).toBe(4);
  });

  test("scales independently per hand label (negative — Pair count does not feed High Card)", () => {
    const counts = { ...emptyHandCounts(), Pair: 7, "High Card": 0 };
    const result = applyHandLevelJokers([createSupernovaJoker()], {
      playedHandLabel: "High Card",
      handPlayCounts: counts,
    });
    expect(result.additiveMult).toBe(0);
  });

  test("contributes 0 mult when handPlayCounts is missing from context (negative)", () => {
    const result = applyHandLevelJokers([createSupernovaJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.additiveMult).toBe(0);
  });
});
