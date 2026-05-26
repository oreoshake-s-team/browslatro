// @vitest-environment node
import {
  MAX_JOKERS,
  applyJokersToScoring,
  applyPostHandJokers,
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

describe("applyPostHandJokers — Joker Stencil (issue #131)", () => {
  test("multiplies xMult by empty-slot count when only Stencil is equipped", () => {
    const result = applyPostHandJokers([createJokerStencilJoker()]);
    expect(result.xMult).toBe(MAX_JOKERS - 1);
  });

  test("reports Stencil as fired when at least one slot is empty", () => {
    const result = applyPostHandJokers([createJokerStencilJoker()]);
    expect(result.firedJokerIds).toEqual(["joker-stencil"]);
  });

  test("emits one step per fired Stencil with xMultFactor = emptySlots", () => {
    const result = applyPostHandJokers([createJokerStencilJoker()]);
    expect(result.steps).toEqual([
      { jokerId: "joker-stencil", xMultFactor: MAX_JOKERS - 1 },
    ]);
  });

  test("does NOT fire when all 5 slots are filled (existing behavior preserved)", () => {
    const stencil = createJokerStencilJoker();
    const result = applyPostHandJokers([
      stencil,
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
    ]);
    expect(result.firedJokerIds).toEqual([]);
  });

  test("returns xMult=1 when Stencil does not fire", () => {
    const stencil = createJokerStencilJoker();
    const result = applyPostHandJokers([
      stencil,
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
    ]);
    expect(result.xMult).toBe(1);
  });

  test("returns no steps when Stencil does not fire", () => {
    const stencil = createJokerStencilJoker();
    const result = applyPostHandJokers([
      stencil,
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
    ]);
    expect(result.steps).toEqual([]);
  });

  test("ignores hand-pre and per-card jokers (only post-hand jokers fire here)", () => {
    const result = applyPostHandJokers([
      createPlusFourMultJoker(),
      createBusinessCardJoker(),
      createGreedyJoker(),
      createJollyJoker(),
    ]);
    expect(result.firedJokerIds).toEqual([]);
  });

  test("walks the joker row left → right and emits steps in array order", () => {
    const a = createJokerStencilJoker();
    const b = createJokerStencilJoker();
    const result = applyPostHandJokers([a, b]);
    expect(result.steps.map((s) => s.jokerId)).toEqual([
      "joker-stencil",
      "joker-stencil",
    ]);
  });

  test("two Stencils equipped multiply their xMult contributions", () => {
    const result = applyPostHandJokers([
      createJokerStencilJoker(),
      createJokerStencilJoker(),
    ]);
    const emptySlots = MAX_JOKERS - 2;
    expect(result.xMult).toBe(emptySlots * emptySlots);
  });
});
