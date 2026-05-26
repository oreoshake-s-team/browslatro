// @vitest-environment node
import {
  MAX_JOKERS,
  applyHandLevelJokers,
  applyJokersToScoring,
  createBusinessCardJoker,
  createGreedyJoker,
  createJokerStencilJoker,
  createJollyJoker,
  createPlusFourMultJoker,
} from "../jokers";

describe("applyJokersToScoring — Joker Stencil", () => {
  test("contributes xMult equal to empty slot count when only Stencil is equipped", () => {
    const result = applyJokersToScoring([createJokerStencilJoker()], []);
    expect(result.xMult).toBe(MAX_JOKERS - 1);
  });

  test("contributes xMult equal to 2 when 3 jokers are equipped", () => {
    const jokers = [
      createPlusFourMultJoker(),
      createBusinessCardJoker(),
      createJokerStencilJoker(),
    ];
    const result = applyJokersToScoring(jokers, []);
    expect(result.xMult).toBe(MAX_JOKERS - jokers.length);
  });

  test("is a no-op (xMult stays at 1) when all 5 slots are filled", () => {
    const stencil = createJokerStencilJoker();
    const jokers = [
      stencil,
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
    ];
    const result = applyJokersToScoring(jokers, []);
    expect(result.xMult).toBe(1);
  });
});

describe("applyHandLevelJokers — Joker Stencil (issue #131, #225)", () => {
  test("multiplies xMult by empty-slot count when only Stencil is equipped", () => {
    const result = applyHandLevelJokers([createJokerStencilJoker()]);
    expect(result.xMult).toBe(MAX_JOKERS - 1);
  });

  test("reports Stencil as fired when at least one slot is empty", () => {
    const result = applyHandLevelJokers([createJokerStencilJoker()]);
    expect(result.firedJokerIds).toEqual(["joker-stencil"]);
  });

  test("emits one step per fired Stencil with xMultFactor = emptySlots", () => {
    const result = applyHandLevelJokers([createJokerStencilJoker()]);
    expect(result.steps).toEqual([
      { jokerId: "joker-stencil", xMultFactor: MAX_JOKERS - 1 },
    ]);
  });

  test("does NOT fire when all 5 slots are filled", () => {
    const stencil = createJokerStencilJoker();
    const result = applyHandLevelJokers([
      stencil,
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
    ]);
    expect(result.firedJokerIds).toEqual(["plus-four-mult", "plus-four-mult", "plus-four-mult", "plus-four-mult"]);
  });

  test("returns xMult=1 when Stencil does not fire (slots full)", () => {
    const stencil = createJokerStencilJoker();
    const result = applyHandLevelJokers([
      stencil,
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
    ]);
    expect(result.xMult).toBe(1);
  });

  test("emits no Stencil step when Stencil does not fire (slots full)", () => {
    const stencil = createJokerStencilJoker();
    const result = applyHandLevelJokers([
      stencil,
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
    ]);
    const stencilSteps = result.steps.filter((s) => s.jokerId === "joker-stencil");
    expect(stencilSteps).toEqual([]);
  });

  test("ignores per-card-only jokers (Greedy / Business Card) when computing Stencil position", () => {
    const result = applyHandLevelJokers([
      createBusinessCardJoker(),
      createGreedyJoker(),
      createJokerStencilJoker(),
    ]);
    expect(result.steps).toEqual([
      { jokerId: "joker-stencil", xMultFactor: MAX_JOKERS - 3 },
    ]);
  });

  test("Stencil step appears in joker-list order alongside other hand-level steps", () => {
    const result = applyHandLevelJokers(
      [createJokerStencilJoker(), createPlusFourMultJoker(), createJollyJoker()],
      { playedHandLabel: "Pair", playedCardCount: 2 },
    );
    expect(result.steps.map((s) => s.jokerId)).toEqual([
      "joker-stencil",
      "plus-four-mult",
      "jolly-joker",
    ]);
  });

  test("two Stencils equipped multiply their xMult contributions", () => {
    const result = applyHandLevelJokers([
      createJokerStencilJoker(),
      createJokerStencilJoker(),
    ]);
    const emptySlots = MAX_JOKERS - 2;
    expect(result.xMult).toBe(emptySlots * emptySlots);
  });

  test("two Stencils emit one step each in array order", () => {
    const result = applyHandLevelJokers([
      createJokerStencilJoker(),
      createJokerStencilJoker(),
    ]);
    expect(result.steps.map((s) => s.jokerId)).toEqual([
      "joker-stencil",
      "joker-stencil",
    ]);
  });
});
