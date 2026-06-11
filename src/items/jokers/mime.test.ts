// @vitest-environment node
import {
  applyHandLevelJokers,
  createBaronJoker,
  createJokerCatalog,
  createMimeJoker,
  createRaisedFistJoker,
  heldRetriggerCountFromJokers,
} from "../jokers";
import {
  STEEL_MULT_FACTOR,
  heldEnhancementIdsWithRedSeal,
  steelHeldMultiplier,
} from "../../cards/heldInHand";
import type { Card } from "../../cards/types";

const heldKing: Card = { id: 1, rank: "K", suit: "spades" };
const heldSteelFive: Card = {
  id: 2,
  rank: "5",
  suit: "clubs",
  enhancement: "steel",
};

describe("Mime", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("mime");
  });

  test("counts one held retrigger per Mime", () => {
    expect(
      heldRetriggerCountFromJokers([createMimeJoker(), createMimeJoker()]),
    ).toBe(2);
  });

  test("doubles Baron's X Mult for a held King", () => {
    const withMime = applyHandLevelJokers(
      [createBaronJoker(), createMimeJoker()],
      { playedHandLabel: "Pair", heldInHandCards: [heldKing] },
    );
    const without = applyHandLevelJokers([createBaronJoker()], {
      playedHandLabel: "Pair",
      heldInHandCards: [heldKing],
    });
    expect(withMime.xMult).toBe(without.xMult ** 2);
  });

  test("doubles Raised Fist's lowest-card mult", () => {
    const withMime = applyHandLevelJokers(
      [createRaisedFistJoker(), createMimeJoker()],
      { playedHandLabel: "Pair", heldInHandCards: [heldKing] },
    );
    const without = applyHandLevelJokers([createRaisedFistJoker()], {
      playedHandLabel: "Pair",
      heldInHandCards: [heldKing],
    });
    expect(withMime.additiveMult).toBe(2 * without.additiveMult);
  });

  test("steel held multiplier squares with one Mime", () => {
    const hand = [heldSteelFive];
    expect(steelHeldMultiplier(hand, new Set(), 1)).toBe(
      STEEL_MULT_FACTOR ** 2,
    );
  });

  test("steel triggers are additive with a red seal", () => {
    const sealedSteel: Card = { ...heldSteelFive, seal: "red" };
    expect(steelHeldMultiplier([sealedSteel], new Set(), 1)).toBe(
      STEEL_MULT_FACTOR ** 3,
    );
  });

  test("gold held ids repeat once per extra trigger", () => {
    const gold: Card = { id: 3, rank: "2", suit: "hearts", enhancement: "gold" };
    expect(heldEnhancementIdsWithRedSeal([gold], new Set(), "gold", 1)).toEqual(
      [3, 3],
    );
  });

  test("without Mime nothing changes (negative)", () => {
    expect(steelHeldMultiplier([heldSteelFive], new Set())).toBe(
      STEEL_MULT_FACTOR,
    );
  });
});
